import "server-only";
import { db } from "@/server/db";
import { notifyTrip } from "@/server/generation/progress";

/** How long a job may sit queued or running before we assume its worker died. */
export const STUCK_AFTER_MINUTES = 45;

/**
 * Hourly housekeeping, run by the worker:
 * - delete guest trips past their expiry (everything cascades);
 * - fail jobs stuck for too long, so trips don't stay "planning" or locked forever;
 * - prune rate-limit buckets idle long enough to be full again.
 */
export async function runMaintenance(now = new Date()) {
  const stuckBefore = new Date(now.getTime() - STUCK_AFTER_MINUTES * 60_000);

  const expired = await db.trip.deleteMany({ where: { userId: null, expiresAt: { lt: now } } });

  const stuckJobs = await db.generationJob.findMany({
    where: { status: { in: ["QUEUED", "RUNNING"] }, createdAt: { lt: stuckBefore } },
    select: { id: true, tripId: true, kind: true },
  });
  if (stuckJobs.length) {
    await db.generationJob.updateMany({
      where: { id: { in: stuckJobs.map((j) => j.id) } },
      data: {
        status: "FAILED",
        error: "This took too long and was stopped. Please try again.",
        finishedAt: now,
      },
    });
    const fullPlanTrips = stuckJobs.filter((j) => j.kind === "FULL_PLAN").map((j) => j.tripId);
    await db.trip.updateMany({
      where: { id: { in: fullPlanTrips }, status: { in: ["QUEUED", "GENERATING"] } },
      data: { status: "FAILED" },
    });
    for (const tripId of new Set(stuckJobs.map((j) => j.tripId))) await notifyTrip(tripId);
  }

  const buckets = await db.rateLimitBucket.deleteMany({
    where: { updatedAt: { lt: new Date(now.getTime() - 2 * 24 * 60 * 60_000) } },
  });

  const summary = {
    expiredGuestTrips: expired.count,
    stuckJobs: stuckJobs.length,
    prunedBuckets: buckets.count,
  };
  console.info("[maintenance]", JSON.stringify(summary));
  return summary;
}
