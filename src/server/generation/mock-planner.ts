import { COUNTRY_OPTIONS } from "@/lib/countries";
import { convertMinor, toMajor, toMinor } from "@/lib/money/convert";
import { CITY_SAMPLES } from "@/server/providers/mock/data/cities";
import {
  citySamplesIn,
  distanceKm,
  findCitySample,
  findCountrySample,
  normalizePlace,
} from "@/server/providers/mock/data/lookup";
import type { CitySample } from "@/server/providers/mock/data/types";
import { SAMPLE_RATES } from "@/server/providers/mock/fx";
import type { ActivityIdea, MealIdea } from "@/server/providers/types";
import type { DayItem, DayPlan, Outline } from "./schemas";
import type { DayContext, Planner, TripBrief } from "./types";

/**
 * LLM_MODE=mock planner: builds plans from the curated city samples, deterministically.
 * Used for local development without an API key, demos and automated tests.
 */
/** Optional artificial latency (MOCK_PLANNER_DELAY_MS) so sample mode can demo and test live progress. */
function simulateLatency(multiplier = 1) {
  const ms = Number(process.env.MOCK_PLANNER_DELAY_MS ?? 0) * multiplier;
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}

export class NoAlternativeError extends Error {
  constructor(city: string) {
    super(
      `Sample mode has no other ideas left for ${city}. Add an ANTHROPIC_API_KEY for more suggestions.`,
    );
    this.name = "NoAlternativeError";
  }
}

export class MockDestinationError extends Error {
  constructor(query: string) {
    const known = CITY_SAMPLES.map((c) => c.city).join(", ");
    super(
      `Sample mode doesn't know "${query}". Try one of: ${known}. Add an ANTHROPIC_API_KEY and set LLM_MODE=live to plan anywhere.`,
    );
    this.name = "MockDestinationError";
  }
}

// Which sample country best fits each interest, for "surprise me".
const SURPRISE_BY_INTEREST: Record<string, string> = {
  food: "JP",
  history: "IT",
  culture: "TR",
  art: "FR",
  nature: "JP",
  nightlife: "ES",
  shopping: "AE",
  beaches: "TH",
  adventure: "TH",
  wellness: "TH",
  family: "GB",
};

function resolveCities(brief: TripBrief): CitySample[] {
  if (brief.surpriseMe) {
    const votes = new Map<string, number>();
    for (const i of brief.interests) {
      const c = SURPRISE_BY_INTEREST[i];
      if (c && c !== brief.nationality) votes.set(c, (votes.get(c) ?? 0) + 1);
    }
    const country = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "JP";
    return citySamplesIn(country);
  }

  const found: CitySample[] = [];
  const add = (c: CitySample) => {
    if (!found.includes(c)) found.push(c);
  };
  const tokens = brief.destinationQuery.split(/[,;:/&+]|\band\b|\bthen\b/i).map((t) => t.trim());
  for (const token of tokens) {
    if (!token) continue;
    const city = findCitySample(token);
    if (city) {
      add(city);
      continue;
    }
    const n = normalizePlace(token);
    const country = COUNTRY_OPTIONS.find((c) => normalizePlace(c.name) === n);
    if (country) citySamplesIn(country.code).forEach(add);
  }
  // Fall back to any known city or country name mentioned anywhere in the text.
  if (found.length === 0) {
    const q = ` ${normalizePlace(brief.destinationQuery)} `;
    for (const c of CITY_SAMPLES) if (q.includes(` ${normalizePlace(c.city)} `)) add(c);
    for (const c of COUNTRY_OPTIONS)
      if (q.includes(` ${normalizePlace(c.name)} `)) citySamplesIn(c.code).forEach(add);
  }
  if (found.length === 0) throw new MockDestinationError(brief.destinationQuery);
  return found;
}

function allocateNights(total: number, stops: number): number[] {
  const base = Math.floor(total / stops);
  return Array.from({ length: stops }, (_, i) => base + (i < total % stops ? 1 : 0));
}

const INTEREST_LABEL: Record<string, string> = {
  food: "food",
  history: "history",
  culture: "culture",
  art: "art",
  nature: "nature",
  nightlife: "nightlife",
  shopping: "shopping",
  beaches: "the coast",
  adventure: "adventure",
  wellness: "slow wellness",
  family: "family fun",
};

export function standardChecklist(brief: TripBrief, countries: string[]): Outline["checklist"] {
  const long = brief.lengthDays > 7;
  return [
    {
      category: "VISA",
      title: "Check entry requirements for your passport",
      description: `Confirm visa or travel authorisation rules for ${countries.join(", ")} on the official sources linked in the Visa tab.`,
      daysBeforeDeparture: 60,
    },
    {
      category: "BOOKINGS",
      title: "Book flights",
      description: "Fares usually rise in the last 6 weeks.",
      daysBeforeDeparture: 45,
    },
    {
      category: "BOOKINGS",
      title: "Book accommodation",
      description: "Reserve the hotels you picked, with free cancellation where possible.",
      daysBeforeDeparture: 40,
    },
    {
      category: "INSURANCE",
      title: "Buy travel insurance",
      description: "Cover medical costs, cancellation and baggage.",
      daysBeforeDeparture: 30,
    },
    {
      category: "BOOKINGS",
      title: "Book timed-entry attractions",
      description:
        "Popular museums and viewpoints sell out; book the ones marked in your itinerary.",
      daysBeforeDeparture: 21,
    },
    {
      category: "MONEY",
      title: "Sort out cards and cash",
      description:
        "Tell your bank you're travelling, carry a card without foreign transaction fees, and get a little local cash.",
      daysBeforeDeparture: 7,
    },
    {
      category: "CONNECTIVITY",
      title: "Set up an eSIM or plan roaming",
      description: "Install an eSIM before you fly so you have data on landing.",
      daysBeforeDeparture: 3,
    },
    {
      category: "OTHER",
      title: "Download offline maps and save documents",
      description:
        "Keep copies of your passport, bookings and insurance on your phone and in the cloud.",
      daysBeforeDeparture: 2,
    },
    {
      category: "PACKING",
      title: "Pack for the weather",
      description: long
        ? "Plan to do laundry once mid-trip to pack lighter."
        : "Check the weather tab and pack layers.",
      daysBeforeDeparture: 1,
    },
  ];
}

function interestScore(a: ActivityIdea, interests: string[]): number {
  return a.categories.filter((c) => interests.includes(c)).length;
}

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function travelBetween(a: { lat: number; lng: number } | null, b: { lat: number; lng: number }) {
  if (!a) return { minutes: null, mode: null };
  const km = distanceKm(a, b);
  if (km < 1.5) {
    const minutes = Math.max(5, Math.round(km * 12));
    return { minutes, mode: `${minutes} min walk` };
  }
  const minutes = Math.round(10 + km * 2.5);
  return { minutes, mode: `${minutes} min by metro or taxi` };
}

function usdToLocalMajor(usd: number, currency: string): number {
  return toMajor(convertMinor(toMinor(usd, "USD"), "USD", currency, SAMPLE_RATES), currency);
}

const TRANSFER_USD = { BUDGET: 8, MID: 25, LUXURY: 70 } as const;

export const mockPlanner: Planner = {
  name: "mock",

  async outline(brief) {
    await simulateLatency(2);
    const nights = Math.max(brief.lengthDays - 1, 0);
    const candidates = resolveCities(brief);
    const maxStops = Math.max(1, Math.min(candidates.length, Math.floor(nights / 2)));
    const cities = candidates.slice(0, maxStops);
    const nightsPerStop = allocateNights(nights, cities.length);

    const stopForDay: number[] = [];
    let cursor = 0;
    cities.forEach((_, i) => {
      for (let n = 0; n < nightsPerStop[i]!; n++) stopForDay[cursor++] = i;
    });
    while (stopForDay.length < brief.lengthDays) stopForDay.push(cities.length - 1);

    const topInterests = brief.interests.slice(0, 2).map((i) => INTEREST_LABEL[i] ?? i);
    const days = stopForDay.map((stopIndex, i) => {
      const city = cities[stopIndex]!.city;
      const dayNumber = i + 1;
      const isLast = dayNumber === brief.lengthDays && brief.lengthDays > 1;
      const moved = i > 0 && stopForDay[i - 1] !== stopIndex;
      const title =
        dayNumber === 1
          ? `Arrival in ${city}`
          : isLast
            ? `Last morning in ${city} and departure`
            : moved
              ? `Travel to ${city}`
              : `${city}: ${topInterests.join(" and ")}`;
      return {
        dayNumber,
        stopIndex,
        title,
        theme:
          dayNumber === 1
            ? "Settle in with an easy first evening."
            : isLast
              ? "A relaxed morning before heading home."
              : `A full day built around ${topInterests.join(" and ")}.`,
      };
    });

    const primary = cities[0]!;
    const country = findCountrySample(primary.country);
    const countries = [...new Set(cities.map((c) => c.country))];
    const title =
      cities.length === 1
        ? `${brief.lengthDays} days in ${primary.city}`
        : `${brief.lengthDays} days: ${cities.map((c) => c.city).join(" & ")}`;

    return {
      title,
      summary: `${cities.map((c) => c.summary).join(" ")} Paced for ${brief.travellers === 1 ? "a solo traveller" : `${brief.travellers} travellers`} who love ${topInterests.join(" and ")}.`,
      stops: cities.map((c, i) => ({
        city: c.city,
        country: c.country,
        nights: nightsPerStop[i]!,
        summary: c.summary,
        lat: c.lat,
        lng: c.lng,
        currency: c.currency,
      })),
      days,
      practical: {
        currencyName: country?.currencyName ?? primary.currency,
        cashVsCard: country?.cashVsCard ?? "Cards are widely accepted; carry a little cash.",
        language: country?.language ?? "Local language",
        tipping: country?.tipping ?? "Tipping customs vary; round up for good service.",
        safety: country?.safety ?? [],
        localTransport: country?.localTransport ?? [],
        bestAreas: cities.map((c) => ({ city: c.city, areas: c.bestAreas.slice(0, 3) })),
        plugType: country?.plugType ?? "Check before you travel",
        emergencyNumber: country?.emergencyNumber ?? "112",
        connectivity: country?.connectivity ?? "eSIMs are widely available for visitors.",
      },
      checklist: standardChecklist(brief, countries),
    };
  },

  async day(d: DayContext): Promise<DayPlan> {
    await simulateLatency();
    const travellers = d.brief.travellers;
    const currency = d.stop.currency;
    const ideas = d.ideas ?? { activities: [], meals: [] };
    const used = new Set(d.alreadyPlanned.map(normalizePlace));
    const fresh = <T extends { name: string }>(xs: T[]) =>
      xs.filter((x) => !used.has(normalizePlace(x.name)));

    const activities = fresh(ideas.activities).sort(
      (a, b) => interestScore(b, d.brief.interests) - interestScore(a, d.brief.interests),
    );
    const tierRank = { BUDGET: 0, MID: 1, LUXURY: 2 } as const;
    // Stay within one price level of the travel style, and never put luxury venues in a mid-range plan.
    const allowedTiers = {
      BUDGET: ["BUDGET", "MID"],
      MID: ["BUDGET", "MID"],
      LUXURY: ["MID", "LUXURY"],
    }[d.brief.style];
    const meals = fresh(ideas.meals.filter((m) => allowedTiers.includes(m.tier))).sort(
      (a, b) =>
        Math.abs(tierRank[a.tier] - tierRank[d.brief.style]) -
        Math.abs(tierRank[b.tier] - tierRank[d.brief.style]),
    );

    const items: DayItem[] = [];
    let clock = d.isArrivalDay ? 15 * 60 : d.fromStop ? 9 * 60 : 9 * 60 + 30;
    let here: { lat: number; lng: number } | null = null;

    const push = (
      item: Omit<DayItem, "startTime" | "travelMinFromPrev" | "travelModeFromPrev"> & {
        lat: number | null;
        lng: number | null;
      },
    ) => {
      const travel =
        item.lat !== null && item.lng !== null
          ? travelBetween(here, { lat: item.lat, lng: item.lng })
          : { minutes: null, mode: null };
      clock += travel.minutes ?? 0;
      items.push({
        ...item,
        startTime: minutesToHHMM(clock),
        travelMinFromPrev: travel.minutes,
        travelModeFromPrev: travel.mode,
      });
      clock += item.durationMin;
      if (item.lat !== null && item.lng !== null) here = { lat: item.lat, lng: item.lng };
    };

    const slotFor = (min: number): DayItem["slot"] =>
      min < 12 * 60 ? "MORNING" : min < 17 * 60 ? "AFTERNOON" : "EVENING";

    const addActivity = (a: ActivityIdea) => {
      push({
        type: "ACTIVITY",
        slot: slotFor(clock),
        durationMin: a.durationMin,
        title: a.name,
        description: a.description,
        location: a.area,
        lat: a.lat,
        lng: a.lng,
        costTotalMajor: a.costPerPersonMajor * travellers,
        currency: a.currency,
        bookingTip: a.bookingTip ?? null,
      });
      used.add(normalizePlace(a.name));
    };

    const addMeal = (slot: MealIdea["slot"]) => {
      const meal =
        meals.find((m) => m.slot === slot && !used.has(normalizePlace(m.name))) ??
        meals.find((m) => !used.has(normalizePlace(m.name)));
      if (!meal) {
        push({
          type: "MEAL",
          slot: slotFor(clock),
          durationMin: 75,
          title: slot === "EVENING" ? "Dinner near your hotel" : "Lunch nearby",
          description: "Pick somewhere local that looks busy.",
          location: d.hotelArea ?? d.stop.city,
          lat: null,
          lng: null,
          costTotalMajor: usdToLocalMajor(
            { BUDGET: 12, MID: 30, LUXURY: 90 }[d.brief.style] * travellers,
            currency,
          ),
          currency,
          bookingTip: null,
        });
        return;
      }
      if (slot === "EVENING") clock = Math.max(clock, 19 * 60);
      if (slot === "AFTERNOON") clock = Math.max(clock, 12 * 60 + 30);
      push({
        type: "MEAL",
        slot: slotFor(clock),
        durationMin: slot === "EVENING" ? 105 : 75,
        title: meal.name,
        description: meal.description,
        location: meal.area,
        lat: meal.lat,
        lng: meal.lng,
        costTotalMajor: meal.costPerPersonMajor * travellers,
        currency: meal.currency,
        bookingTip: meal.tier === "LUXURY" ? "Reserve a table in advance." : null,
      });
      used.add(normalizePlace(meal.name));
    };

    const transferCost = usdToLocalMajor(
      TRANSFER_USD[d.brief.style] * (d.brief.style === "LUXURY" ? 1 : travellers),
      currency,
    );
    /** Pick the best-matching unused activity, trying each preference in order. */
    const nextActivity = (...prefs: ((a: ActivityIdea) => boolean)[]) => {
      for (const pred of prefs.length ? prefs : [() => true]) {
        const a = activities.find((x) => !used.has(normalizePlace(x.name)) && pred(x));
        if (a) {
          addActivity(a);
          return a;
        }
      }
      return undefined;
    };
    const slotIs =
      (...slots: ActivityIdea["bestSlot"][]) =>
      (a: ActivityIdea) =>
        slots.includes(a.bestSlot);
    const short = (max: number) => (a: ActivityIdea) => a.durationMin <= max;

    if (d.isArrivalDay) {
      push({
        type: "TRANSPORT",
        slot: "AFTERNOON",
        durationMin: 60,
        title: `Arrive and transfer to ${d.hotelArea ?? "your hotel"}`,
        description:
          d.brief.style === "LUXURY"
            ? "Pre-booked private transfer from the airport."
            : "Take the airport train or express bus into the city.",
        location: d.stop.city,
        lat: null,
        lng: null,
        costTotalMajor: transferCost,
        currency,
        bookingTip: null,
      });
      clock += 60; // check in and freshen up
      nextActivity(slotIs("EVENING"), (a) => slotIs("ANY")(a) && short(120)(a));
      addMeal("EVENING");
    } else if (d.isDepartureDay) {
      nextActivity((a) => slotIs("MORNING", "ANY")(a) && short(150)(a));
      addMeal("AFTERNOON");
      push({
        type: "TRANSPORT",
        slot: slotFor(clock),
        durationMin: 60,
        title: "Transfer to the airport",
        description: "Allow at least 3 hours before an international flight.",
        location: d.stop.city,
        lat: null,
        lng: null,
        costTotalMajor: transferCost,
        currency,
        bookingTip: null,
      });
    } else {
      if (d.fromStop) {
        const km = distanceKm(d.fromStop, d.stop);
        const hours = Math.max(1, Math.round(km / 180));
        push({
          type: "TRANSPORT",
          slot: "MORNING",
          durationMin: hours * 60,
          title: `Travel from ${d.fromStop.city} to ${d.stop.city}`,
          description:
            km > 700
              ? "Short flight or long-distance train; book ahead for the best fares."
              : "Intercity train; reserve seats ahead in busy seasons.",
          location: `${d.fromStop.city} to ${d.stop.city}`,
          lat: null,
          lng: null,
          costTotalMajor: usdToLocalMajor(
            (15 + 0.12 * km) * travellers * (d.brief.style === "LUXURY" ? 2 : 1),
            currency,
          ),
          currency,
          bookingTip: "Book tickets in advance.",
        });
        clock += 45; // drop bags at the hotel
        here = { lat: d.stop.lat, lng: d.stop.lng };
      } else {
        nextActivity(slotIs("MORNING"), slotIs("ANY"));
      }
      addMeal("AFTERNOON");
      nextActivity(slotIs("AFTERNOON"), slotIs("ANY"));
      if (!d.fromStop && clock < 17 * 60)
        nextActivity((a) => slotIs("AFTERNOON", "ANY")(a) && short(120)(a));
      addMeal("EVENING");
      if (clock < 22 * 60) nextActivity(slotIs("EVENING"));
    }

    // Long stays can exhaust the curated list; fill with free time rather than repeating.
    if (items.filter((i) => i.type === "ACTIVITY").length === 0 && !d.isArrivalDay) {
      push({
        type: "ACTIVITY",
        slot: "AFTERNOON",
        durationMin: 150,
        title: `Free time in ${d.hotelArea ?? d.stop.city}`,
        description: "Wander, revisit a favourite spot or rest.",
        location: d.hotelArea ?? d.stop.city,
        lat: null,
        lng: null,
        costTotalMajor: 0,
        currency,
        bookingTip: null,
      });
    }

    const highlights = items.filter((i) => i.type === "ACTIVITY").map((i) => i.title);
    return {
      title: d.dayTitle,
      summary: highlights.length ? `Highlights: ${highlights.join(", ")}.` : d.dayTheme,
      items: [...d.lockedItems, ...items].sort((a, b) =>
        (a.startTime ?? "").localeCompare(b.startTime ?? ""),
      ),
    };
  },

  async alternative(d: DayContext, replace: DayItem, rest: DayItem[]): Promise<DayItem> {
    await simulateLatency();
    const taken = new Set(
      [...d.alreadyPlanned, ...rest.map((i) => i.title), replace.title].map(normalizePlace),
    );
    const travellers = d.brief.travellers;
    if (replace.type === "MEAL") {
      const meal = (d.ideas?.meals ?? [])
        .filter((m) => !taken.has(normalizePlace(m.name)))
        .sort((a, b) => Number(b.slot === replace.slot) - Number(a.slot === replace.slot))[0];
      if (!meal) throw new NoAlternativeError(d.stop.city);
      return {
        ...replace,
        title: meal.name,
        description: meal.description,
        location: meal.area,
        lat: meal.lat,
        lng: meal.lng,
        costTotalMajor: meal.costPerPersonMajor * travellers,
        currency: meal.currency,
        bookingTip: meal.tier === "LUXURY" ? "Reserve a table in advance." : null,
        travelMinFromPrev: null,
        travelModeFromPrev: null,
      };
    }
    const wanted: ActivityIdea["bestSlot"] = replace.slot;
    const activity = (d.ideas?.activities ?? [])
      .filter((a) => !taken.has(normalizePlace(a.name)))
      .sort(
        (a, b) =>
          Number(b.bestSlot === wanted || b.bestSlot === "ANY") -
            Number(a.bestSlot === wanted || a.bestSlot === "ANY") ||
          interestScore(b, d.brief.interests) - interestScore(a, d.brief.interests),
      )[0];
    if (!activity) throw new NoAlternativeError(d.stop.city);
    return {
      ...replace,
      title: activity.name,
      description: activity.description,
      location: activity.area,
      lat: activity.lat,
      lng: activity.lng,
      durationMin: activity.durationMin,
      costTotalMajor: activity.costPerPersonMajor * travellers,
      currency: activity.currency,
      bookingTip: activity.bookingTip ?? null,
      travelMinFromPrev: null,
      travelModeFromPrev: null,
    };
  },
};
