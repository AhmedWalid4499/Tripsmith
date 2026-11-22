import "server-only";
import { retimeDay, type RetimeItem } from "@/lib/retime";
import { db } from "@/server/db";

export type DayOrderChange = { dayId: string; itemIds: string[] };

/**
 * Apply new item orders (possibly moving items between days) and recalculate times.
 * `invalidated` items lose their travel info (e.g. a swapped item is somewhere new), and so
 * does whatever follows them.
 */
export async function resequenceDays(
  changes: DayOrderChange[],
  invalidated: Set<string> = new Set(),
) {
  const dayIds = changes.map((c) => c.dayId);
  const current = await db.itineraryItem.findMany({
    where: { dayId: { in: dayIds } },
    orderBy: [{ dayId: "asc" }, { order: "asc" }],
  });
  // Also load items moving in from days not listed (shouldn't happen, but stay safe).
  const allIds = changes.flatMap((c) => c.itemIds);
  const extra = await db.itineraryItem.findMany({
    where: { id: { in: allIds }, dayId: { notIn: dayIds } },
  });
  const byId = new Map([...current, ...extra].map((i) => [i.id, i]));

  // Who preceded whom before the change.
  const previousPredecessor = new Map<string, string | null>();
  const grouped = new Map<string, typeof current>();
  for (const item of [...current, ...extra]) {
    grouped.set(item.dayId, [...(grouped.get(item.dayId) ?? []), item]);
  }
  for (const items of grouped.values()) {
    items.sort((a, b) => a.order - b.order);
    items.forEach((item, i) => previousPredecessor.set(item.id, items[i - 1]?.id ?? null));
  }

  const updates = changes.flatMap(({ dayId, itemIds }) => {
    const input: RetimeItem[] = itemIds.map((id) => {
      const item = byId.get(id);
      if (!item) throw new Error(`Unknown item ${id}`);
      const prevId = previousPredecessor.get(id) ?? null;
      const stale =
        invalidated.has(id) || (prevId !== null && invalidated.has(prevId)) || item.dayId !== dayId;
      return {
        id,
        type: item.type,
        startTime: item.startTime,
        durationMin: item.durationMin,
        travelMinFromPrev: item.travelMinFromPrev,
        travelModeFromPrev: item.travelModeFromPrev,
        previousPredecessorId: stale ? null : prevId,
      };
    });
    return retimeDay(input).map((r) =>
      db.itineraryItem.update({ where: { id: r.id }, data: { ...r, id: undefined, dayId } }),
    );
  });
  await db.$transaction(updates);
}
