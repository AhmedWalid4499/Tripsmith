/** Due date for a checklist task: N days before departure (date-only, UTC). */
export function dueDateFor(
  startDate: Date | null,
  daysBeforeDeparture: number | null,
): Date | null {
  if (!startDate || daysBeforeDeparture === null) return null;
  const d = new Date(startDate);
  d.setUTCDate(d.getUTCDate() - daysBeforeDeparture);
  return d;
}

export type DueState = "overdue" | "soon" | "later" | "none";

/** How urgent a task is relative to today: overdue, due within 7 days, or later. */
export function dueState(dueDate: Date | null, done: boolean, today = new Date()): DueState {
  if (!dueDate || done) return "none";
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const days = Math.round((dueDate.getTime() - t) / 86_400_000);
  if (days < 0) return "overdue";
  if (days <= 7) return "soon";
  return "later";
}
