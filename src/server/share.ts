import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { computeBudget } from "@/lib/budget";
import type { RateTable } from "@/lib/money/convert";
import { formatMoney } from "@/lib/money/currencies";
import { moneyFormatter } from "@/lib/money/display";
import { PracticalInfoSchema } from "@/lib/practical-info";
import { SHARE_SLUG_PATTERN } from "@/lib/share";
import { db } from "@/server/db";
import { SAMPLE_RATES } from "@/server/providers/mock/fx";

export const tripCacheTag = (tripId: string) => `trip:${tripId}`;

/**
 * The access check for a public link. Deliberately NOT cached: turning sharing off (or replacing
 * the link) must take effect immediately on every server instance.
 */
export async function findSharedTrip(slug: string) {
  if (!SHARE_SLUG_PATTERN.test(slug)) return null;
  return db.trip.findFirst({
    where: { shareSlug: slug, isPublic: true, status: "READY", userId: { not: null } },
    select: { id: true, shareShowCosts: true },
  });
}

/**
 * Read-only content for the shared view. Cached briefly per trip; planner Server Actions expire it
 * with updateTag, and worker edits (regenerate / swap) show up when the cache lifetime runs out.
 * Only what a travel companion needs is included: no passport country, visa details, checklist,
 * guest tokens or owner identity. Prices appear only when the owner opted in.
 */
export async function getSharedTripContent(tripId: string, showCosts: boolean) {
  "use cache";
  cacheTag(tripCacheTag(tripId));
  cacheLife("minutes");

  const trip = await db.trip.findUniqueOrThrow({
    where: { id: tripId },
    include: {
      fxSnapshot: true,
      stops: { orderBy: { order: "asc" }, include: { hotels: { where: { selected: true } } } },
      days: { orderBy: { dayNumber: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
      flights: { where: { selected: true } },
      visas: true,
      budgetLines: true,
    },
  });
  const rates = (trip.fxSnapshot?.rates as RateTable | undefined) ?? SAMPLE_RATES;
  const money = moneyFormatter(rates, trip.displayCurrency);
  const price = (minor: number, currency: string) =>
    showCosts ? (minor === 0 ? "Free" : money.format(minor, currency)) : null;

  let budget: {
    total: string;
    perPerson: string;
    lines: { label: string; amount: string }[];
  } | null = null;
  if (showCosts) {
    const b = computeBudget({
      travellers: trip.travellers,
      budgetMinor: trip.budgetMinor,
      budgetCurrency: trip.budgetCurrency,
      displayCurrency: trip.displayCurrency,
      rates,
      flight: trip.flights[0]
        ? { priceMinor: trip.flights[0].priceMinor, currency: trip.flights[0].currency }
        : null,
      hotels: trip.stops.flatMap((s) =>
        s.hotels.map((h) => ({
          nightlyMinor: h.nightlyMinor,
          currency: h.currency,
          nights: s.nights,
        })),
      ),
      items: trip.days.flatMap((d) => d.items),
      visas: trip.visas.map((v) => ({ costMinor: v.costMinor, currency: v.currency })),
      manualLines: trip.budgetLines,
    });
    budget = {
      total: formatMoney(b.totalMinor, b.currency),
      perPerson: formatMoney(Math.round(b.totalMinor / trip.travellers), b.currency),
      lines: b.lines.map((l) => ({
        label: l.label,
        amount: formatMoney(l.amountMinor, b.currency),
      })),
    };
  }

  const info = PracticalInfoSchema.safeParse(trip.practicalInfo);
  const stopById = new Map(trip.stops.map((s) => [s.id, s]));
  return {
    title: trip.title,
    countries: trip.countries,
    startDate: trip.startDate,
    endDate: trip.endDate,
    lengthDays: trip.lengthDays,
    travellers: trip.travellers,
    showCosts,
    pricesCheckedAt: trip.days.flatMap((d) => d.items)[0]?.priceCheckedAt ?? trip.updatedAt,
    stops: trip.stops.map((s) => ({
      city: s.city,
      country: s.country,
      nights: s.nights,
      hotel: s.hotels[0]
        ? {
            name: s.hotels[0].name,
            area: s.hotels[0].area,
            nightly: price(s.hotels[0].nightlyMinor, s.hotels[0].currency),
          }
        : null,
    })),
    days: trip.days.map((d) => ({
      dayNumber: d.dayNumber,
      date: d.date,
      title: d.title,
      summary: d.summary,
      city: d.stopId ? (stopById.get(d.stopId)?.city ?? null) : null,
      items: d.items.map((i) => ({
        id: i.id,
        type: i.type,
        startTime: i.startTime,
        durationMin: i.durationMin,
        travelModeFromPrev: i.travelModeFromPrev,
        title: i.title,
        description: i.description,
        location: i.location,
        tip: i.notes,
        price: price(i.costMinor, i.currency),
      })),
    })),
    practical: info.success
      ? {
          currency: info.data.currency,
          tipping: info.data.tipping,
          localTransport: info.data.localTransport,
          safety: info.data.safety,
          weather: info.data.weather,
          plugType: info.data.plugType,
          emergencyNumber: info.data.emergencyNumber,
          language: info.data.language,
        }
      : null,
    budget,
  };
}

export type SharedTrip = Awaited<ReturnType<typeof getSharedTripContent>>;
