import "server-only";
import type { Prisma, TripStop } from "@/generated/prisma/client";
import { dueDateFor } from "@/lib/checklist";
import { countryName } from "@/lib/countries";
import { toMajor, toMinor } from "@/lib/money/convert";
import { currencyForCountry } from "@/lib/money/country-currency";
import { PracticalInfoSchema, type PracticalInfo } from "@/lib/practical-info";
import { officialVisaSource } from "@/lib/visa/official-sources";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { LlmNotConfiguredError, LlmRefusalError } from "@/server/llm/client";
import { getProviders, type Providers } from "@/server/providers/registry";
import { llmPlanner } from "./llm-planner";
import { MockDestinationError, mockPlanner } from "./mock-planner";
import { notifyTrip, reportProgress } from "./progress";
import { isValidCurrency, normalizeOutline } from "./normalize";
import type { DayItem } from "./schemas";
import type { DayContext, Planner, PlannerContext, StopInfo, TripBrief } from "./types";

export function getPlanner(): Planner {
  const e = env();
  if (e.LLM_MODE === "mock") return mockPlanner;
  if (!e.ANTHROPIC_API_KEY) throw new LlmNotConfiguredError();
  return llmPlanner;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function briefFromTrip(trip: Prisma.TripGetPayload<object>): TripBrief {
  return {
    destinationQuery: trip.destinationQuery,
    surpriseMe: trip.surpriseMe,
    departureCity: trip.departureCity,
    startDate: trip.startDate,
    endDate: trip.endDate,
    lengthDays: trip.lengthDays,
    travellers: trip.travellers,
    budgetMajor: toMajor(trip.budgetMinor, trip.budgetCurrency),
    budgetCurrency: trip.budgetCurrency,
    style: trip.style,
    interests: trip.interests,
    nationality: trip.nationality,
  };
}

function toDayItem(i: Prisma.ItineraryItemGetPayload<object>): DayItem {
  return {
    type: i.type === "HOTEL" ? "ACTIVITY" : i.type,
    slot: i.slot,
    startTime: i.startTime,
    durationMin: i.durationMin ?? 60,
    travelMinFromPrev: i.travelMinFromPrev,
    travelModeFromPrev: i.travelModeFromPrev,
    title: i.title,
    description: i.description ?? "",
    location: i.location ?? "",
    lat: i.lat,
    lng: i.lng,
    costTotalMajor: toMajor(i.costMinor, i.currency),
    currency: i.currency,
    bookingTip: i.notes,
  };
}

/**
 * Generate and save one day. Reads all context from the database, so it serves both the full
 * plan and "regenerate this day". Locked items are kept.
 */
export async function planDay(
  tripId: string,
  dayNumber: number,
  planner: Planner,
  providers: Providers,
  ctx: PlannerContext,
) {
  const trip = await db.trip.findUniqueOrThrow({
    where: { id: tripId },
    include: {
      stops: { orderBy: { order: "asc" } },
      days: { orderBy: { dayNumber: "asc" }, include: { items: true } },
      hotels: { where: { selected: true } },
    },
  });
  const day = trip.days.find((d) => d.dayNumber === dayNumber);
  if (!day) throw new Error(`Day ${dayNumber} not found`);
  const stop = trip.stops.find((s) => s.id === day.stopId) ?? trip.stops[0]!;
  const prevDay = trip.days.find((d) => d.dayNumber === dayNumber - 1);
  const prevStop = prevDay ? trip.stops.find((s) => s.id === prevDay.stopId) : null;

  const info = PracticalInfoSchema.safeParse(trip.practicalInfo);
  const weather = info.success ? info.data.weather.find((w) => w.city === stop.city) : undefined;
  const hotel = trip.hotels.find((h) => h.stopId === stop.id);
  const ideas = await providers.activityIdeas(stop.city, stop.country);

  const toStopInfo = (s: typeof stop): StopInfo => ({
    city: s.city,
    country: s.country,
    currency: currencyForCountry(s.country) ?? "USD",
    lat: s.lat ?? 0,
    lng: s.lng ?? 0,
  });

  const dayCtx: DayContext = {
    brief: briefFromTrip(trip),
    outline: {
      title: trip.title,
      summary: "",
      stops: trip.stops.map((s) => ({
        city: s.city,
        country: s.country,
        nights: s.nights,
        summary: s.summary ?? "",
        lat: s.lat ?? 0,
        lng: s.lng ?? 0,
        currency: currencyForCountry(s.country) ?? "USD",
      })),
    },
    dayNumber,
    dayTitle: day.title,
    dayTheme: day.summary ?? "",
    stop: toStopInfo(stop),
    fromStop: prevStop && prevStop.id !== stop.id ? toStopInfo(prevStop) : null,
    isArrivalDay: dayNumber === 1,
    isDepartureDay: dayNumber === trip.lengthDays && trip.lengthDays > 1,
    date: day.date,
    weatherSummary: weather?.summary ?? null,
    hotelArea: hotel ? `${hotel.name}, ${hotel.area}` : null,
    alreadyPlanned: trip.days
      .filter((d) => d.dayNumber !== dayNumber)
      .flatMap((d) => d.items.filter((i) => i.type !== "TRANSPORT").map((i) => i.title)),
    ideas: ideas?.value ?? null,
    lockedItems: day.items.filter((i) => i.locked).map(toDayItem),
  };

  const plan = await planner.day(dayCtx, ctx);
  const lockedTitles = new Set(dayCtx.lockedItems.map((i) => i.title));
  const fallbackCurrency = dayCtx.stop.currency;
  const now = new Date();

  await db.$transaction([
    db.itineraryItem.deleteMany({ where: { dayId: day.id } }),
    db.tripDay.update({
      where: { id: day.id },
      data: { title: plan.title, summary: plan.summary },
    }),
    db.itineraryItem.createMany({
      data: plan.items.map((item, order) => {
        const currency = isValidCurrency(item.currency.toUpperCase())
          ? item.currency.toUpperCase()
          : fallbackCurrency;
        return {
          dayId: day.id,
          order,
          type: item.type,
          slot: item.slot,
          startTime: item.startTime,
          durationMin: item.durationMin,
          travelMinFromPrev: item.travelMinFromPrev,
          travelModeFromPrev: item.travelModeFromPrev,
          title: item.title,
          description: item.description,
          location: item.location,
          lat: item.lat,
          lng: item.lng,
          costMinor: toMinor(item.costTotalMajor, currency),
          currency,
          priceSource: "ESTIMATE" as const,
          priceCheckedAt: now,
          notes: item.bookingTip,
          locked: lockedTitles.has(item.title),
        };
      }),
    }),
  ]);
}

function friendlyError(error: unknown): string {
  if (error instanceof MockDestinationError || error instanceof LlmNotConfiguredError)
    return error.message;
  if (error instanceof LlmRefusalError)
    return "The planner couldn't create this trip. Try rewording the destination or adjusting the details.";
  return "Something went wrong while planning. Please try again.";
}

/** Background job: build the whole plan for a trip. Never throws; failures are recorded on the job. */
export async function runFullPlan(jobId: string) {
  const job = await db.generationJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "SUCCEEDED") return;

  const trip = await db.trip.findUniqueOrThrow({ where: { id: job.tripId } });
  const ctx: PlannerContext = { tripId: trip.id, jobId: job.id, userId: trip.userId };
  const progress = (step: string, pct: number, message: string) =>
    reportProgress(job, { step, progress: pct, message });

  try {
    await db.$transaction([
      db.generationJob.update({
        where: { id: job.id },
        data: { status: "RUNNING", startedAt: new Date(), error: null },
      }),
      db.trip.update({ where: { id: trip.id }, data: { status: "GENERATING" } }),
      // A retry starts clean.
      db.tripStop.deleteMany({ where: { tripId: trip.id } }),
      db.flightOption.deleteMany({ where: { tripId: trip.id } }),
      db.visaInfo.deleteMany({ where: { tripId: trip.id } }),
      db.checklistItem.deleteMany({ where: { tripId: trip.id } }),
      db.tripDay.deleteMany({ where: { tripId: trip.id } }),
    ]);

    const planner = getPlanner();
    const providers = getProviders();
    const brief = briefFromTrip(trip);

    await progress(
      "outline",
      4,
      brief.surpriseMe ? "Choosing somewhere you'll love…" : "Sketching your route…",
    );
    const outline = normalizeOutline(await planner.outline(brief, ctx), trip.lengthDays);
    const countries = [...new Set(outline.stops.map((s) => s.country))];

    await progress("save-outline", 15, `Mapping ${outline.stops.map((s) => s.city).join(", ")}…`);
    const fx = await providers.fx();
    const snapshot = await db.fxRateSnapshot.create({
      data: {
        rates: fx.rates,
        provider: fx.provider,
        priceSource: fx.priceSource,
        fetchedAt: fx.fetchedAt,
      },
    });
    const stops: TripStop[] = [];
    for (const [order, s] of outline.stops.entries()) {
      stops.push(
        await db.tripStop.create({
          data: {
            tripId: trip.id,
            order,
            city: s.city,
            country: s.country,
            nights: s.nights,
            summary: s.summary,
            lat: s.lat,
            lng: s.lng,
          },
        }),
      );
    }
    await db.tripDay.createMany({
      data: outline.days.map((d) => ({
        tripId: trip.id,
        stopId: stops[d.stopIndex]!.id,
        dayNumber: d.dayNumber,
        date: trip.startDate ? addDays(trip.startDate, d.dayNumber - 1) : null,
        title: d.title,
        summary: d.theme,
      })),
    });
    await db.trip.update({
      where: { id: trip.id },
      data: { title: outline.title, countries, fxSnapshotId: snapshot.id },
    });

    // Weather: typical climate for the month the traveller is in each city (needs dates).
    await progress("weather", 18, "Checking the weather for your dates…");
    const weather: PracticalInfo["weather"] = [];
    if (trip.startDate) {
      for (const [i, s] of outline.stops.entries()) {
        const firstDay = outline.days.find((d) => d.stopIndex === i)?.dayNumber ?? 1;
        const month = addDays(trip.startDate, firstDay - 1).getUTCMonth() + 1;
        const w = await providers.weather({ city: s.city, country: s.country, month }, ctx);
        if (w) weather.push({ city: s.city, ...w.value });
      }
    }
    const primary = outline.stops[0]!;
    const practicalInfo: PracticalInfo = {
      currency: {
        code: primary.currency,
        name: outline.practical.currencyName,
        cashVsCard: outline.practical.cashVsCard,
      },
      language: outline.practical.language,
      tipping: outline.practical.tipping,
      safety: outline.practical.safety,
      localTransport: outline.practical.localTransport,
      bestAreas: outline.practical.bestAreas,
      weather,
      plugType: outline.practical.plugType,
      emergencyNumber: outline.practical.emergencyNumber,
      connectivity: outline.practical.connectivity,
    };
    await db.trip.update({ where: { id: trip.id }, data: { practicalInfo } });

    // Visa requirements, one per destination country.
    await progress(
      "visa",
      20,
      `Checking visa rules for a ${countryName(trip.nationality)} passport…`,
    );
    for (const country of countries) {
      const stayDays =
        outline.stops.filter((s) => s.country === country).reduce((n, s) => n + s.nights, 0) + 1;
      const v = await providers.visa(
        { nationality: trip.nationality, destination: country, stayDays },
        ctx,
      );
      if (!v) continue;
      const source = officialVisaSource(country);
      await db.visaInfo.create({
        data: {
          tripId: trip.id,
          country,
          nationality: trip.nationality,
          requirement: v.value.requirement,
          visaType: v.value.visaType,
          costMinor: v.value.cost?.amountMinor ?? null,
          currency: v.value.cost?.currency ?? null,
          processingTime: v.value.processingTime,
          maxStayDays: v.value.maxStayDays,
          documents: v.value.documents,
          notes: v.value.notes,
          // Links only ever come from the curated official-sources table.
          officialUrl: source?.url ?? null,
          officialSourceName: source?.name ?? null,
          confidence: v.value.confidence,
          checkedAt: v.value.checkedAt,
        },
      });
    }

    await progress("flights", 23, `Estimating flights from ${trip.departureCity}…`);
    const lastDay = trip.startDate ? addDays(trip.startDate, trip.lengthDays - 1) : null;
    const flight = await providers.flight(
      {
        fromCity: trip.departureCity,
        toCity: primary.city,
        toCountry: primary.country,
        departDate: trip.startDate,
        returnDate: lastDay,
        travellers: trip.travellers,
        style: trip.style,
      },
      ctx,
    );
    if (flight) {
      const f = flight.value;
      await db.flightOption.create({
        data: {
          tripId: trip.id,
          fromCity: f.fromCity,
          toCity: f.toCity,
          roundTrip: f.roundTrip,
          airline: f.airline,
          stops: f.stops,
          durationMin: f.durationMin,
          priceMinor: f.price.amountMinor,
          currency: f.price.currency,
          priceSource: f.price.priceSource,
          priceCheckedAt: f.price.checkedAt,
          notes: f.notes,
          selected: true,
        },
      });
    }

    await progress("hotels", 26, "Finding places to stay…");
    for (const [i, stop] of stops.entries()) {
      if (stop.nights === 0) continue;
      const firstDay = outline.days.find((d) => d.stopIndex === i)?.dayNumber ?? 1;
      const options = await providers.hotels(
        {
          city: stop.city,
          country: stop.country,
          nights: stop.nights,
          checkIn: trip.startDate ? addDays(trip.startDate, firstDay - 1) : null,
          travellers: trip.travellers,
          style: trip.style,
        },
        ctx,
      );
      if (!options) continue;
      const preferred = options.value.find((o) => o.tier === trip.style) ?? options.value[0];
      await db.hotelOption.createMany({
        data: options.value.map((o) => ({
          tripId: trip.id,
          stopId: stop.id,
          tier: o.tier,
          name: o.name,
          area: o.area,
          description: o.description,
          nightlyMinor: o.nightly.amountMinor,
          currency: o.nightly.currency,
          priceSource: o.nightly.priceSource,
          priceCheckedAt: o.nightly.checkedAt,
          rating: o.rating,
          url: o.url,
          selected: o === preferred,
        })),
      });
    }

    // Days: the long part, one model call each.
    for (const d of outline.days) {
      const pct = 30 + (65 * (d.dayNumber - 1)) / outline.days.length;
      await progress(
        `day:${d.dayNumber}`,
        pct,
        `Building day ${d.dayNumber} of ${outline.days.length}…`,
      );
      await planDay(trip.id, d.dayNumber, planner, providers, ctx);
    }

    await progress("checklist", 96, "Writing your pre-trip checklist…");
    await db.checklistItem.createMany({
      data: outline.checklist.map((c, order) => ({
        tripId: trip.id,
        order,
        category: c.category,
        title: c.title,
        description: c.description,
        daysBeforeDeparture: c.daysBeforeDeparture,
        dueDate: dueDateFor(trip.startDate, c.daysBeforeDeparture),
      })),
    });

    await db.$transaction([
      db.trip.update({
        where: { id: trip.id },
        data: { status: "READY", generatedAt: new Date() },
      }),
      db.generationJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCEEDED",
          progress: 100,
          step: "done",
          message: "Your trip is ready.",
          finishedAt: new Date(),
        },
      }),
    ]);
    await notifyTrip(trip.id);
  } catch (error) {
    console.error(`[generation] job ${job.id} failed`, error);
    await db.$transaction([
      db.trip.update({ where: { id: trip.id }, data: { status: "FAILED" } }),
      db.generationJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: friendlyError(error), finishedAt: new Date() },
      }),
    ]);
    await notifyTrip(trip.id);
  }
}
