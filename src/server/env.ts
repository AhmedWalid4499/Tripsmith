import "server-only";
import { z } from "zod";

/**
 * Server environment, validated lazily on first use so `next build` can run
 * without runtime secrets. Never import this from client components.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Auth.js
  /** Required by the web app (checked in auth.ts); the worker doesn't need it. */
  AUTH_SECRET: z.string().min(16).optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_RESEND_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Tripsmith <no-reply@tripsmith.local>"),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  /** "mock" builds plans from curated sample data instead of calling the API (tests, local dev without a key). */
  LLM_MODE: z.enum(["live", "mock"]).default("live"),

  // Providers: "mock" | "llm" now; real providers plug in later behind these flags.
  FLIGHT_PROVIDER: z.string().default("mock"),
  HOTEL_PROVIDER: z.string().default("mock"),
  ACTIVITY_PROVIDER: z.string().default("mock"),
  VISA_PROVIDER: z.string().default("mock"),
  WEATHER_PROVIDER: z.string().default("mock"),
  FX_PROVIDER: z.string().default("mock"),

  // Jobs
  /** Run the pg-boss worker inside the web process (handy locally; use a separate worker service in production). */
  RUN_WORKER_IN_WEB: z.enum(["true", "false"]).default("false"),

  // Rate limits
  GENERATIONS_PER_DAY_USER: z.coerce.number().int().positive().default(10),
  GENERATIONS_PER_DAY_IP: z.coerce.number().int().positive().default(5),
  EDITS_PER_DAY_USER: z.coerce.number().int().positive().default(60),
  EDITS_PER_DAY_IP: z.coerce.number().int().positive().default(100),
  GUEST_TRIP_TTL_DAYS: z.coerce.number().int().positive().default(7),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `  ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new Error(`Invalid environment variables:\n${issues}\nSee .env.example.`);
    }
    cached = parsed.data;
  }
  return cached;
}
