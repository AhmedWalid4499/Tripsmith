import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { db } from "@/server/db";
import { env } from "@/server/env";

export class LlmNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set. Add it, or set LLM_MODE=mock to use sample plans.");
    this.name = "LlmNotConfiguredError";
  }
}

/** The model declined the request (stop_reason "refusal"), even after any server-side fallback. */
export class LlmRefusalError extends Error {
  constructor(public readonly category: string | null) {
    super("The planner declined this request.");
    this.name = "LlmRefusalError";
  }
}

/** Output was truncated or didn't match the schema. Safe to retry. */
export class LlmOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmOutputError";
  }
}

export type LlmContext = { tripId?: string; jobId?: string; userId?: string | null };

export type StructuredRequest<T> = {
  /** Short label for usage logs, e.g. "outline", "day", "visa-estimate". */
  purpose: string;
  schema: z.ZodType<T>;
  /** Stable instructions; cached across calls. Keep per-request data out of it. */
  system: string;
  prompt: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  ctx: LlmContext;
};

// Models that accept the server-side refusal fallback parameter.
const FALLBACK_MODELS = new Set([
  "claude-fable-5-2",
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
]);

let client: Anthropic | undefined;
function getClient(): Anthropic {
  const key = env().ANTHROPIC_API_KEY;
  if (!key) throw new LlmNotConfiguredError();
  client ??= new Anthropic({ apiKey: key });
  return client;
}

async function logUsage(
  req: StructuredRequest<unknown>,
  model: string,
  usage: Anthropic.Beta.BetaUsage,
) {
  try {
    await db.llmUsage.create({
      data: {
        tripId: req.ctx.tripId,
        jobId: req.ctx.jobId,
        userId: req.ctx.userId ?? null,
        model,
        purpose: req.purpose,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (error) {
    // Usage logging must never fail a plan.
    console.error("[llm] failed to log usage", error);
  }
}

async function attempt<T>(req: StructuredRequest<T>): Promise<T> {
  const model = env().ANTHROPIC_MODEL;
  // The SDK helper builds a JSON schema the API accepts. We drop its auto-parse so we can check
  // stop_reason (refusal / truncation) before validating with Zod ourselves.
  const format = betaZodOutputFormat(req.schema);

  const stream = getClient().beta.messages.stream({
    model,
    max_tokens: req.maxTokens ?? 32_000,
    ...(FALLBACK_MODELS.has(model)
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
    system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
    output_config: {
      effort: req.effort ?? "medium",
      format: { type: format.type, schema: format.schema },
    },
    messages: [{ role: "user", content: req.prompt }],
  });

  const message = await stream.finalMessage();
  await logUsage(req as StructuredRequest<unknown>, message.model, message.usage);

  if (message.stop_reason === "refusal") {
    throw new LlmRefusalError(message.stop_details?.category ?? null);
  }
  if (message.stop_reason === "max_tokens") {
    throw new LlmOutputError(`Output for "${req.purpose}" was cut off at max_tokens.`);
  }

  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new LlmOutputError(`Output for "${req.purpose}" was not valid JSON.`);
  }
  const parsed = req.schema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new LlmOutputError(`Output for "${req.purpose}" failed validation: ${issues}`);
  }
  return parsed.data;
}

/**
 * One structured-output call: streamed (long outputs never hit HTTP timeouts), validated with Zod,
 * token usage logged per trip. Retries once on truncated or invalid output; the SDK already
 * retries transient API errors (429 / 5xx / network).
 */
export async function generateStructured<T>(req: StructuredRequest<T>): Promise<T> {
  try {
    return await attempt(req);
  } catch (error) {
    if (error instanceof LlmOutputError) {
      console.warn(`[llm] ${error.message} Retrying once.`);
      return attempt({ ...req, maxTokens: Math.min((req.maxTokens ?? 32_000) * 2, 64_000) });
    }
    throw error;
  }
}

export function llmMode(): "live" | "mock" {
  return env().LLM_MODE;
}
