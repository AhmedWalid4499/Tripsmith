/**
 * Integration check for the Postgres token bucket (needs DATABASE_URL).
 * Run: pnpm tsx-server tests/integration/rate-limit.check.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { db } from "@/server/db";
import { takeToken } from "@/server/rate-limit";

const key = `test:${Date.now()}`;
try {
  // 10 concurrent requests against a 3-token bucket: exactly 3 may pass.
  const results = await Promise.all(
    Array.from({ length: 10 }, () => takeToken(key, { capacity: 3, windowSeconds: 3600 })),
  );
  const passed = results.filter((r) => r.ok).length;
  assert.equal(passed, 3, `expected 3 to pass, got ${passed}`);
  const blocked = results.find((r) => !r.ok);
  assert.ok(
    blocked && !blocked.ok && blocked.retryAfterSeconds > 1000 && blocked.retryAfterSeconds <= 1200,
    "retry-after ≈ 20 min for one token",
  );

  // Refill: a fast bucket (2 tokens / 2 s) recovers a token after ~1 s.
  const fast = `${key}:fast`;
  assert.ok((await takeToken(fast, { capacity: 2, windowSeconds: 2 })).ok);
  assert.ok((await takeToken(fast, { capacity: 2, windowSeconds: 2 })).ok);
  assert.ok(!(await takeToken(fast, { capacity: 2, windowSeconds: 2 })).ok);
  await new Promise((r) => setTimeout(r, 1100));
  assert.ok((await takeToken(fast, { capacity: 2, windowSeconds: 2 })).ok, "refilled after 1.1 s");
  console.log("rate limit: concurrency, retry-after and refill OK");
} finally {
  await db.rateLimitBucket.deleteMany({ where: { key: { startsWith: key } } });
  process.exit(0);
}
