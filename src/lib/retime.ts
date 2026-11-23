/**
 * Recalculate times for a day after items were reordered, moved in or removed.
 * Pure and isomorphic: the server persists the result; tests cover the rules.
 *
 * Rules:
 * - The day starts at the earliest original start time among its items (or 09:00).
 * - Each item starts when the previous one ends, plus travel time.
 * - Travel info is kept only when the item still follows the same item as before;
 *   otherwise it's unknown and we allow a default gap.
 * - Meals keep their original time unless the new order pushes them later.
 */
export type RetimeItem = {
  id: string;
  type: "ACTIVITY" | "MEAL" | "TRANSPORT" | "HOTEL";
  startTime: string | null;
  durationMin: number | null;
  travelMinFromPrev: number | null;
  travelModeFromPrev: string | null;
  /** The id of the item that preceded this one before the change (null if it was first or came from another day). */
  previousPredecessorId: string | null;
};

export type RetimedFields = {
  id: string;
  order: number;
  startTime: string;
  slot: "MORNING" | "AFTERNOON" | "EVENING";
  travelMinFromPrev: number | null;
  travelModeFromPrev: string | null;
};

const DEFAULT_START = 9 * 60;
const DEFAULT_GAP = 20;
const DEFAULT_DURATION = 60;
const LATEST = 23 * 60 + 45;

export function parseHHMM(value: string | null): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatHHMM(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, LATEST));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

export function slotForMinutes(minutes: number): RetimedFields["slot"] {
  return minutes < 12 * 60 ? "MORNING" : minutes < 17 * 60 ? "AFTERNOON" : "EVENING";
}

export function retimeDay(items: RetimeItem[]): RetimedFields[] {
  const starts = items.map((i) => parseHHMM(i.startTime)).filter((t): t is number => t !== null);
  let clock = starts.length ? Math.min(...starts) : DEFAULT_START;

  return items.map((item, index) => {
    const prev = items[index - 1];
    const sameNeighbour = Boolean(prev && item.previousPredecessorId === prev.id);
    const travel = !prev ? null : sameNeighbour ? (item.travelMinFromPrev ?? 0) : DEFAULT_GAP;

    let start = clock + (travel ?? 0);
    const original = parseHHMM(item.startTime);
    if (item.type === "MEAL" && original !== null) start = Math.max(start, original);

    clock = start + (item.durationMin ?? DEFAULT_DURATION);
    return {
      id: item.id,
      order: index,
      startTime: formatHHMM(start),
      slot: slotForMinutes(start),
      travelMinFromPrev: prev ? (sameNeighbour ? item.travelMinFromPrev : null) : null,
      travelModeFromPrev: prev && sameNeighbour ? item.travelModeFromPrev : null,
    };
  });
}
