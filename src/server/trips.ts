import "server-only";
import { computeBudget } from "@/lib/budget";
import type { RateTable } from "@/lib/money/convert";
import { moneyFormatter } from "@/lib/money/display";
import { PracticalInfoSchema } from "@/lib/practical-info";
import { db } from "@/server/db";
import { SAMPLE_RATES } from "@/server/providers/mock/fx";
import { canEditTrip, getViewer } from "@/server/trip-access";

/** Everything the trip page needs, or null if the viewer can't see it. */
export async function getTripDetail(tripId: string) {
  const viewer = await getViewer();
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      fxSnapshot: true,
      stops: {
        orderBy: { order: "asc" },
        include: { hotels: { orderBy: { nightlyMinor: "asc" } } },
      },
      days: { orderBy: { dayNumber: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
      flights: true,
      visas: true,
      checklist: { orderBy: [{ dueDate: "asc" }, { order: "asc" }] },
      budgetLines: true,
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!trip || !canEditTrip(trip, viewer)) return null;
  if (!trip.userId && trip.expiresAt && trip.expiresAt < new Date()) return null;

  const rates = (trip.fxSnapshot?.rates as RateTable | undefined) ?? SAMPLE_RATES;
  const money = moneyFormatter(rates, trip.displayCurrency);
  const flight = trip.flights.find((f) => f.selected) ?? null;
  const budget = computeBudget({
    travellers: trip.travellers,
    budgetMinor: trip.budgetMinor,
    budgetCurrency: trip.budgetCurrency,
    displayCurrency: trip.displayCurrency,
    rates,
    flight: flight ? { priceMinor: flight.priceMinor, currency: flight.currency } : null,
    hotels: trip.stops.flatMap((s) =>
      s.hotels
        .filter((h) => h.selected)
        .map((h) => ({ nightlyMinor: h.nightlyMinor, currency: h.currency, nights: s.nights })),
    ),
    items: trip.days.flatMap((d) => d.items),
    visas: trip.visas.map((v) => ({ costMinor: v.costMinor, currency: v.currency })),
    manualLines: trip.budgetLines,
  });
  const info = PracticalInfoSchema.safeParse(trip.practicalInfo);

  return {
    trip,
    viewer,
    isGuestTrip: !trip.userId,
    money,
    budget,
    flight,
    practicalInfo: info.success ? info.data : null,
    latestJob: trip.jobs[0] ?? null,
  };
}

export type TripDetail = NonNullable<Awaited<ReturnType<typeof getTripDetail>>>;
