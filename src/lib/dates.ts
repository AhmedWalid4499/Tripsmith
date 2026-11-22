/** Format a date-only value (stored as UTC midnight) without timezone drift. */
export function formatDay(date: Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...opts,
  }).format(date);
}

export function formatDateRange(start: Date, end: Date): string {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  return `${formatDay(start, sameYear ? {} : { year: "numeric" })} – ${formatDay(end, { year: "numeric" })}`;
}
