import { currencyForCountry } from "@/lib/money/country-currency";
import type { Outline } from "./schemas";

export function isValidCurrency(code: string): boolean {
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code });
    return /^[A-Z]{3}$/.test(code);
  } catch {
    return false;
  }
}

/** Make the model's outline consistent with the trip: exact day count, nights summing correctly. */
export function normalizeOutline(outline: Outline, lengthDays: number): Outline {
  const stops = outline.stops.map((s) => ({
    ...s,
    country: s.country.toUpperCase(),
    currency: isValidCurrency(s.currency.toUpperCase())
      ? s.currency.toUpperCase()
      : (currencyForCountry(s.country) ?? "USD"),
    nights: Math.max(0, s.nights),
  }));
  const targetNights = Math.max(lengthDays - 1, 0);
  let diff = targetNights - stops.reduce((n, s) => n + s.nights, 0);
  // Absorb any mismatch into the longest stays.
  for (let i = 0; diff !== 0 && i < 100; i++) {
    const idx = stops.reduce((best, s, j) => (s.nights > stops[best]!.nights ? j : best), 0);
    if (diff > 0) {
      stops[idx]!.nights++;
      diff--;
    } else if (stops[idx]!.nights > 0) {
      stops[idx]!.nights--;
      diff++;
    } else break;
  }

  const byNumber = new Map(outline.days.map((d) => [d.dayNumber, d]));
  const days = Array.from({ length: lengthDays }, (_, i) => {
    const d = byNumber.get(i + 1) ?? outline.days[i] ?? outline.days.at(-1)!;
    return {
      ...d,
      dayNumber: i + 1,
      stopIndex: Math.min(Math.max(d.stopIndex, 0), stops.length - 1),
    };
  });
  return { ...outline, stops, days };
}
