import "server-only";
import { db } from "@/server/db";

export const PROGRESS_CHANNEL = "trip_progress";

/** Update a job's progress and wake any SSE listeners for the trip (Postgres NOTIFY). */
export async function reportProgress(
  job: { id: string; tripId: string },
  update: { step: string; progress: number; message: string },
) {
  await db.generationJob.update({
    where: { id: job.id },
    data: { step: update.step, progress: Math.round(update.progress), message: update.message },
  });
  await notifyTrip(job.tripId);
}

export async function notifyTrip(tripId: string) {
  await db.$executeRaw`SELECT pg_notify(${PROGRESS_CHANNEL}, ${tripId})`;
}
