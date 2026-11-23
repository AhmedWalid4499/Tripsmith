import "server-only";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { env } from "@/server/env";

/**
 * Token buckets stored in Postgres (`RateLimitBucket`), shared by every web instance.
 * A bucket holds up to `capacity` tokens and refills continuously at capacity / window.
 */
export type Limit = { capacity: number; windowSeconds: number };

export type LimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Atomically take `cost` tokens. One statement: refill based on elapsed time, then spend, but only
 * if enough tokens remain, so concurrent requests can never overspend.
 */
export async function takeToken(key: string, limit: Limit, cost = 1): Promise<LimitResult> {
  const refillPerSecond = limit.capacity / limit.windowSeconds;
  const rows = await db.$queryRaw<{ tokens: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "tokens", "updatedAt")
    VALUES (${key}, ${limit.capacity - cost}, now())
    ON CONFLICT ("key") DO UPDATE SET
      "tokens" = LEAST(${limit.capacity}::float8,
        "RateLimitBucket"."tokens" + EXTRACT(EPOCH FROM (now() - "RateLimitBucket"."updatedAt")) * ${refillPerSecond}::float8) - ${cost}::float8,
      "updatedAt" = now()
    WHERE LEAST(${limit.capacity}::float8,
        "RateLimitBucket"."tokens" + EXTRACT(EPOCH FROM (now() - "RateLimitBucket"."updatedAt")) * ${refillPerSecond}::float8) >= ${cost}::float8
    RETURNING "tokens"`;
  if (rows.length > 0) return { ok: true };

  const bucket = await db.rateLimitBucket.findUnique({ where: { key } });
  const elapsed = bucket ? (Date.now() - bucket.updatedAt.getTime()) / 1000 : 0;
  const available = bucket
    ? Math.min(limit.capacity, bucket.tokens + elapsed * refillPerSecond)
    : 0;
  return {
    ok: false,
    retryAfterSeconds: Math.max(1, Math.ceil((cost - available) / refillPerSecond)),
  };
}

/** Best-effort client IP. Railway and most proxies set X-Forwarded-For; the first entry is the client. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

const DAY = 24 * 60 * 60;

export type LimitKind = "plan" | "edit";

/** Limits for new plans (full generations) and planner edits (regenerate a day, swap an item). */
function limitsFor(kind: LimitKind) {
  const e = env();
  return kind === "plan"
    ? {
        user: { capacity: e.GENERATIONS_PER_DAY_USER, windowSeconds: DAY },
        ip: { capacity: e.GENERATIONS_PER_DAY_IP, windowSeconds: DAY },
      }
    : {
        user: { capacity: e.EDITS_PER_DAY_USER, windowSeconds: DAY },
        ip: { capacity: e.EDITS_PER_DAY_IP, windowSeconds: DAY },
      };
}

export function describeWait(seconds: number): string {
  if (seconds < 90) return "in a minute";
  if (seconds < 90 * 60) return `in about ${Math.round(seconds / 60)} minutes`;
  return `in about ${Math.round(seconds / 3600)} hours`;
}

/**
 * Signed-in users are limited per account; guests (who can't be identified otherwise, and can reset
 * the one-trip cookie by clearing it) are limited per IP.
 */
export async function checkGenerationLimit(
  kind: LimitKind,
  userId: string | null,
): Promise<{ error?: string }> {
  const limits = limitsFor(kind);
  const result = userId
    ? await takeToken(`${kind}:user:${userId}`, limits.user)
    : await takeToken(`${kind}:ip:${await clientIp()}`, limits.ip);
  if (result.ok) return {};
  const what = kind === "plan" ? "new trips" : "changes that need the planner";
  return {
    error: `You've reached today's limit for ${what}. Please try again ${describeWait(result.retryAfterSeconds)}.`,
  };
}
