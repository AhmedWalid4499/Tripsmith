import "server-only";
import { toMinor } from "@/lib/money/convert";
import { db } from "@/server/db";
import { resequenceDays } from "@/server/planner/resequence";
import { getProviders } from "@/server/providers/registry";
import { buildDayContext, friendlyError, getPlanner, planDay, toDayItem } from "./orchestrator";
import { isValidCurrency } from "./normalize";
import { notifyTrip, reportProgress } from "./progress";

export type EditJobParams = { dayNumber?: number; itemId?: string };

/** Background job for edits that need the planner: regenerate a day, or swap one item. Never throws. */
export async function runEditJob(jobId: string) {
  const job = await db.generationJob.findUnique({ where: { id: jobId }, include: { trip: true } });
  if (!job || job.status === "SUCCEEDED") return;
  const ctx = { tripId: job.tripId, jobId: job.id, userId: job.trip.userId };
  const params = (job.params ?? {}) as EditJobParams;

  try {
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", startedAt: new Date(), error: null },
    });
    const planner = getPlanner();
    const providers = getProviders();
    let doneMessage = "Done.";

    if (job.kind === "REGENERATE_DAY") {
      const dayNumber = params.dayNumber!;
      await reportProgress(job, {
        step: `regen:${dayNumber}`,
        progress: 20,
        message: `Rebuilding day ${dayNumber}…`,
      });
      await planDay(job.tripId, dayNumber, planner, providers, ctx);
      doneMessage = `Day ${dayNumber} has a fresh plan.`;
    } else if (job.kind === "SWAP_ACTIVITY") {
      const item = await db.itineraryItem.findUniqueOrThrow({
        where: { id: params.itemId! },
        include: { day: { include: { items: { orderBy: { order: "asc" } } } } },
      });
      await reportProgress(job, {
        step: `swap:${item.id}`,
        progress: 30,
        message: `Finding an alternative to ${item.title}…`,
      });
      const { dayCtx } = await buildDayContext(job.tripId, item.day.dayNumber, providers);
      const rest = item.day.items.filter((i) => i.id !== item.id).map(toDayItem);
      const alt = await planner.alternative(dayCtx, toDayItem(item), rest, ctx);
      const currency = isValidCurrency(alt.currency.toUpperCase())
        ? alt.currency.toUpperCase()
        : dayCtx.stop.currency;
      await db.itineraryItem.update({
        where: { id: item.id },
        data: {
          title: alt.title,
          description: alt.description,
          location: alt.location,
          lat: alt.lat,
          lng: alt.lng,
          durationMin: alt.durationMin,
          costMinor: toMinor(alt.costTotalMajor, currency),
          currency,
          priceSource: "ESTIMATE",
          priceCheckedAt: new Date(),
          notes: alt.bookingTip,
          locked: false,
        },
      });
      await resequenceDays(
        [{ dayId: item.dayId, itemIds: item.day.items.map((i) => i.id) }],
        new Set([item.id]),
      );
      doneMessage = `Swapped in ${alt.title}.`;
    } else {
      throw new Error(`Unsupported edit job kind ${job.kind}`);
    }

    await db.generationJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        progress: 100,
        step: "done",
        message: doneMessage,
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[edits] job ${job.id} failed`, error);
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: friendlyError(error), finishedAt: new Date() },
    });
  }
  await notifyTrip(job.tripId);
}
