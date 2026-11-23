/**
 * Integration check for hourly maintenance (needs DATABASE_URL).
 * Run: pnpm tsx-server tests/integration/maintenance.check.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { db } from "@/server/db";
import { runMaintenance, STUCK_AFTER_MINUTES } from "@/server/jobs/maintenance";

const base = {
  title: "Maintenance test",
  destinationQuery: "Rome",
  departureCity: "Cairo",
  lengthDays: 3,
  travellers: 1,
  budgetMinor: 100_000,
  budgetCurrency: "USD" as const,
  displayCurrency: "USD" as const,
  style: "MID" as const,
  interests: ["food"],
  nationality: "EG",
};
const longAgo = new Date(Date.now() - (STUCK_AFTER_MINUTES + 5) * 60_000);

const expired = await db.trip.create({
  data: { ...base, expiresAt: new Date(Date.now() - 60_000) },
});
const fresh = await db.trip.create({
  data: { ...base, expiresAt: new Date(Date.now() + 86_400_000) },
});
const stuck = await db.trip.create({
  data: {
    ...base,
    status: "GENERATING",
    jobs: { create: { kind: "FULL_PLAN", status: "RUNNING", createdAt: longAgo } },
  },
  include: { jobs: true },
});
try {
  const summary = await runMaintenance();
  assert.ok(summary.expiredGuestTrips >= 1);
  assert.equal(await db.trip.count({ where: { id: expired.id } }), 0, "expired guest trip deleted");
  assert.equal(await db.trip.count({ where: { id: fresh.id } }), 1, "unexpired guest trip kept");
  const job = await db.generationJob.findUniqueOrThrow({ where: { id: stuck.jobs[0]!.id } });
  assert.equal(job.status, "FAILED");
  assert.equal(
    (await db.trip.findUniqueOrThrow({ where: { id: stuck.id } })).status,
    "FAILED",
    "stuck trip released",
  );
  console.log("maintenance: expiry, stuck jobs OK", JSON.stringify(summary));
} finally {
  await db.trip.deleteMany({ where: { id: { in: [expired.id, fresh.id, stuck.id] } } });
  process.exit(0);
}
