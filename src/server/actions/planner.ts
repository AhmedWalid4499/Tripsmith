"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { DISPLAY_CURRENCIES } from "@/lib/money/currencies";
import { db } from "@/server/db";
import type { EditJobParams } from "@/server/generation/edits";
import { enqueueEdit } from "@/server/jobs/queue";
import { resequenceDays } from "@/server/planner/resequence";
import { findOwnedTrip } from "@/server/trip-access";
import { checkGenerationLimit } from "@/server/rate-limit";
import { tripCacheTag } from "@/server/share";

export type ActionResult = { ok?: true; error?: string };

const NOT_FOUND: ActionResult = { error: "That trip couldn't be found. Refresh and try again." };
const BUSY: ActionResult = {
  error: "Another change is still being made to this trip. Try again in a moment.",
};

async function ownedTripOrNull(tripId: string) {
  const owned = await findOwnedTrip(tripId);
  return owned?.trip ?? null;
}

/** Resolve an item and check the viewer owns its trip. */
async function ownedItem(itemId: string) {
  const item = await db.itineraryItem.findUnique({ where: { id: itemId }, include: { day: true } });
  if (!item) return null;
  const trip = await ownedTripOrNull(item.day.tripId);
  return trip ? { item, trip } : null;
}

async function hasActiveJob(tripId: string) {
  const n = await db.generationJob.count({
    where: { tripId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  return n > 0;
}

function done(tripId: string): ActionResult {
  updateTag(tripCacheTag(tripId)); // the shared view, if any
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

const ReorderSchema = z
  .array(z.object({ dayId: z.string().min(1), itemIds: z.array(z.string().min(1)) }))
  .min(1)
  .max(2);

/**
 * Persist a drag-and-drop result: the new item order for one day, or for two days when an item
 * moved between them. Every item that was in those days must still be accounted for.
 */
export async function reorderItemsAction(
  tripId: string,
  rawChanges: unknown,
): Promise<ActionResult> {
  const parsed = ReorderSchema.safeParse(rawChanges);
  if (!parsed.success) return { error: "That move didn't work. Refresh and try again." };
  const trip = await ownedTripOrNull(tripId);
  if (!trip) return NOT_FOUND;

  const changes = parsed.data;
  const dayIds = changes.map((c) => c.dayId);
  const days = await db.tripDay.findMany({
    where: { id: { in: dayIds }, tripId },
    include: { items: { select: { id: true } } },
  });
  if (days.length !== new Set(dayIds).size) return NOT_FOUND;

  const before = new Set(days.flatMap((d) => d.items.map((i) => i.id)));
  const after = changes.flatMap((c) => c.itemIds);
  if (after.length !== before.size || after.some((id) => !before.has(id))) {
    return { error: "The plan changed while you were editing. Refresh and try again." };
  }
  await resequenceDays(changes);
  return done(tripId);
}

export async function moveItemToDayAction(itemId: string, toDayId: string): Promise<ActionResult> {
  const owned = await ownedItem(itemId);
  if (!owned) return NOT_FOUND;
  const { item, trip } = owned;
  if (item.dayId === toDayId) return { ok: true };
  const target = await db.tripDay.findFirst({
    where: { id: toDayId, tripId: trip.id },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!target) return NOT_FOUND;
  const source = await db.itineraryItem.findMany({
    where: { dayId: item.dayId },
    orderBy: { order: "asc" },
  });
  await resequenceDays([
    { dayId: item.dayId, itemIds: source.filter((i) => i.id !== item.id).map((i) => i.id) },
    { dayId: target.id, itemIds: [...target.items.map((i) => i.id), item.id] },
  ]);
  return done(trip.id);
}

export async function removeItemAction(itemId: string): Promise<ActionResult> {
  const owned = await ownedItem(itemId);
  if (!owned) return NOT_FOUND;
  const { item, trip } = owned;
  await db.itineraryItem.delete({ where: { id: item.id } });
  const rest = await db.itineraryItem.findMany({
    where: { dayId: item.dayId },
    orderBy: { order: "asc" },
  });
  if (rest.length) await resequenceDays([{ dayId: item.dayId, itemIds: rest.map((i) => i.id) }]);
  return done(trip.id);
}

export async function setItemLockedAction(itemId: string, locked: boolean): Promise<ActionResult> {
  const owned = await ownedItem(itemId);
  if (!owned) return NOT_FOUND;
  await db.itineraryItem.update({ where: { id: itemId }, data: { locked } });
  return done(owned.trip.id);
}

export async function selectHotelAction(hotelId: string): Promise<ActionResult> {
  const hotel = await db.hotelOption.findUnique({ where: { id: hotelId } });
  if (!hotel) return NOT_FOUND;
  const trip = await ownedTripOrNull(hotel.tripId);
  if (!trip) return NOT_FOUND;
  await db.$transaction([
    db.hotelOption.updateMany({
      where: { tripId: trip.id, stopId: hotel.stopId },
      data: { selected: false },
    }),
    db.hotelOption.update({ where: { id: hotel.id }, data: { selected: true } }),
  ]);
  return done(trip.id);
}

export async function toggleChecklistItemAction(
  checklistItemId: string,
  isDone: boolean,
): Promise<ActionResult> {
  const entry = await db.checklistItem.findUnique({ where: { id: checklistItemId } });
  if (!entry) return NOT_FOUND;
  const trip = await ownedTripOrNull(entry.tripId);
  if (!trip) return NOT_FOUND;
  await db.checklistItem.update({
    where: { id: entry.id },
    data: { done: isDone, doneAt: isDone ? new Date() : null },
  });
  return done(trip.id);
}

export async function setDisplayCurrencyAction(
  tripId: string,
  currency: string,
): Promise<ActionResult> {
  const parsed = z.enum(DISPLAY_CURRENCIES).safeParse(currency);
  if (!parsed.success) return { error: "Choose USD, EUR or EGP." };
  const trip = await ownedTripOrNull(tripId);
  if (!trip) return NOT_FOUND;
  await db.trip.update({ where: { id: trip.id }, data: { displayCurrency: parsed.data } });
  return done(trip.id);
}

async function queueEdit(
  tripId: string,
  kind: "REGENERATE_DAY" | "SWAP_ACTIVITY",
  params: EditJobParams,
  message: string,
) {
  const job = await db.generationJob.create({ data: { tripId, kind, params, message } });
  try {
    await enqueueEdit(job.id);
  } catch (error) {
    console.error("[planner] failed to enqueue edit", error);
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: "We couldn't start that change. Please try again." },
    });
    return { error: "We couldn't start that change. Please try again." };
  }
  return done(tripId);
}

export async function regenerateDayAction(
  tripId: string,
  dayNumber: number,
): Promise<ActionResult> {
  const trip = await ownedTripOrNull(tripId);
  if (!trip) return NOT_FOUND;
  if (trip.status !== "READY") return BUSY;
  const day = await db.tripDay.findUnique({ where: { tripId_dayNumber: { tripId, dayNumber } } });
  if (!day) return NOT_FOUND;
  if (await hasActiveJob(tripId)) return BUSY;
  const limited = await checkGenerationLimit("edit", trip.userId);
  if (limited.error) return { error: limited.error };
  return queueEdit(tripId, "REGENERATE_DAY", { dayNumber }, `Waiting to rebuild day ${dayNumber}…`);
}

export async function swapItemAction(itemId: string): Promise<ActionResult> {
  const owned = await ownedItem(itemId);
  if (!owned) return NOT_FOUND;
  const { item, trip } = owned;
  if (item.type !== "ACTIVITY" && item.type !== "MEAL")
    return { error: "Only activities and meals can be swapped." };
  if (await hasActiveJob(trip.id)) return BUSY;
  const limited = await checkGenerationLimit("edit", trip.userId);
  if (limited.error) return { error: limited.error };
  return queueEdit(
    trip.id,
    "SWAP_ACTIVITY",
    { itemId, dayNumber: item.day.dayNumber },
    `Waiting to swap ${item.title}…`,
  );
}
