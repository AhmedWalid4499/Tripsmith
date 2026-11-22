import "server-only";
import { z } from "zod";
import { countryName } from "@/lib/countries";
import { toMinor } from "@/lib/money/convert";
import { generateStructured, llmMode } from "@/server/llm/client";
import { estimateFareUsd, roomsFor } from "@/server/providers/mock";
import type {
  ActivityProvider,
  FlightProvider,
  FlightQuery,
  FlightQuote,
  HotelProvider,
  HotelQuery,
  HotelQuote,
  ProviderContext,
  VisaProvider,
  VisaQuery,
  VisaQuote,
  WeatherProvider,
  WeatherQuery,
  WeatherSummary,
} from "@/server/providers/types";

/**
 * LLMEstimate* providers: the fallback when no curated/live data exists. Everything they return is
 * labelled ESTIMATE / AI_ESTIMATE. In LLM_MODE=mock they use simple heuristics instead of the API.
 */
const ESTIMATOR_SYSTEM = `You estimate travel facts for a trip-planning app. The app labels everything you return as an estimate, so give typical, realistic values rather than refusing.
Rules:
- Never include URLs, phone numbers or email addresses.
- Prices are typical 2026 prices. Use the currency requested; amounts are in major units (e.g. 12.5 means 12.50).
- If you're unsure about a specific named business, describe the kind of place instead of inventing a name.
- Be concise and factual. No marketing language.`;

const TIER_USD = { BUDGET: 45, MID: 130, LUXURY: 380 } as const;

const HotelEstimateSchema = z.object({
  options: z
    .array(
      z.object({
        tier: z.enum(["BUDGET", "MID", "LUXURY"]),
        name: z.string(),
        area: z.string(),
        description: z.string(),
        nightlyPerRoomMajor: z.number().positive(),
        rating: z.number().min(0).max(5).nullable(),
      }),
    )
    .min(2)
    .max(3),
  currency: z.string().length(3),
});

export class LLMEstimateHotelProvider implements HotelProvider {
  readonly name = "llm-estimate";
  async options(q: HotelQuery, ctx: ProviderContext): Promise<HotelQuote[]> {
    const rooms = roomsFor(q.travellers);
    const checkedAt = new Date();
    if (llmMode() === "mock") {
      return (["BUDGET", "MID", "LUXURY"] as const).map((tier) => ({
        tier,
        name: { BUDGET: "Budget guesthouse", MID: "Mid-range hotel", LUXURY: "Luxury hotel" }[tier],
        area: `Central ${q.city}`,
        description: "Sample estimate: a typical option at this price level.",
        nightly: {
          amountMinor: toMinor(TIER_USD[tier] * rooms, "USD"),
          currency: "USD",
          priceSource: "ESTIMATE",
          checkedAt,
        },
        rating: null,
        url: null,
      }));
    }
    const out = await generateStructured({
      purpose: "hotel-estimate",
      schema: HotelEstimateSchema,
      system: ESTIMATOR_SYSTEM,
      effort: "low",
      maxTokens: 4000,
      ctx,
      prompt: `Suggest exactly 3 places to stay in ${q.city}, ${countryName(q.country)}: one BUDGET, one MID, one LUXURY.
For each give a real, well-known property if you're confident it exists, its neighbourhood, one sentence on why it suits travellers, a typical nightly price for one double room${q.checkIn ? ` around ${q.checkIn.toISOString().slice(0, 7)}` : ""}, and a typical guest rating out of 5 (null if unknown).
Use the local currency (ISO 4217 code in "currency").`,
    });
    return out.options.map((o) => ({
      tier: o.tier,
      name: o.name,
      area: o.area,
      description: o.description,
      nightly: {
        amountMinor: toMinor(o.nightlyPerRoomMajor * rooms, out.currency),
        currency: out.currency.toUpperCase(),
        priceSource: "ESTIMATE",
        checkedAt,
      },
      rating: o.rating,
      url: null,
    }));
  }
}

const FlightEstimateSchema = z.object({
  roundTripPerPersonUsd: z.number().positive(),
  typicalDurationMin: z.number().int().positive(),
  typicalStops: z.number().int().min(0).max(3),
  exampleAirlines: z.string().nullable(),
  notes: z.string(),
});

export class LLMEstimateFlightProvider implements FlightProvider {
  readonly name = "llm-estimate";
  async estimate(q: FlightQuery, ctx: ProviderContext): Promise<FlightQuote> {
    const checkedAt = new Date();
    const cabin = q.style === "LUXURY" ? "business" : "economy";
    if (llmMode() === "mock") {
      return {
        fromCity: q.fromCity,
        toCity: q.toCity,
        roundTrip: true,
        airline: null,
        stops: null,
        durationMin: null,
        price: {
          amountMinor: toMinor(estimateFareUsd(4000, q.style), "USD"),
          currency: "USD",
          priceSource: "ESTIMATE",
          checkedAt,
        },
        notes: `Sample ${cabin} estimate. Check a flight search site for live prices.`,
      };
    }
    const when = q.departDate ? ` departing around ${q.departDate.toISOString().slice(0, 10)}` : "";
    const out = await generateStructured({
      purpose: "flight-estimate",
      schema: FlightEstimateSchema,
      system: ESTIMATOR_SYSTEM,
      effort: "low",
      maxTokens: 2000,
      ctx,
      prompt: `Estimate a typical ${cabin} round-trip fare per person in USD from ${q.fromCity} to ${q.toCity}, ${countryName(q.toCountry)}${when}, the typical one-way flight duration in minutes including connections, the usual number of stops, a few airlines that commonly fly the route (or null), and a one-sentence note.`,
    });
    return {
      fromCity: q.fromCity,
      toCity: q.toCity,
      roundTrip: true,
      airline: out.exampleAirlines,
      stops: out.typicalStops,
      durationMin: out.typicalDurationMin,
      price: {
        amountMinor: toMinor(out.roundTripPerPersonUsd, "USD"),
        currency: "USD",
        priceSource: "ESTIMATE",
        checkedAt,
      },
      notes: out.notes,
    };
  }
}

const VisaEstimateSchema = z.object({
  requirement: z.enum(["NOT_REQUIRED", "VISA_ON_ARRIVAL", "E_VISA", "VISA_REQUIRED", "UNKNOWN"]),
  visaType: z.string().nullable(),
  costMajor: z.number().nonnegative().nullable(),
  costCurrency: z.string().length(3).nullable(),
  processingTime: z.string().nullable(),
  maxStayDays: z.number().int().positive().nullable(),
  documents: z.array(z.string()).max(10),
  notes: z.string().nullable(),
});

export class LLMEstimateVisaProvider implements VisaProvider {
  readonly name = "llm-estimate";
  async requirements(q: VisaQuery, ctx: ProviderContext): Promise<VisaQuote> {
    const checkedAt = new Date();
    if (llmMode() === "mock") {
      return {
        requirement: "UNKNOWN",
        visaType: null,
        cost: null,
        processingTime: null,
        maxStayDays: null,
        documents: [],
        notes: `Sample mode has no visa data for ${countryName(q.nationality)} passports travelling to ${countryName(q.destination)}. Check the official source or the embassy.`,
        confidence: "AI_ESTIMATE",
        checkedAt,
      };
    }
    const out = await generateStructured({
      purpose: "visa-estimate",
      schema: VisaEstimateSchema,
      system: `${ESTIMATOR_SYSTEM}
- For visa questions, describe the general rule for a tourist stay. If you're not confident, use requirement "UNKNOWN" and say so in notes. The app shows your answer as unverified and links to the official source.`,
      effort: "medium",
      maxTokens: 3000,
      ctx,
      prompt: `What does a citizen of ${countryName(q.nationality)} (${q.nationality}) need to visit ${countryName(q.destination)} (${q.destination}) as a tourist for about ${q.stayDays} days? Give the requirement, visa type, typical fee (major units and ISO currency, or null), typical processing time, maximum stay in days, the usual required documents, and short notes on important conditions.`,
    });
    return {
      requirement: out.requirement,
      visaType: out.visaType,
      cost:
        out.costMajor !== null && out.costCurrency
          ? {
              amountMinor: toMinor(out.costMajor, out.costCurrency),
              currency: out.costCurrency.toUpperCase(),
              priceSource: "ESTIMATE",
              checkedAt,
            }
          : null,
      processingTime: out.processingTime,
      maxStayDays: out.maxStayDays,
      documents: out.documents,
      notes: out.notes,
      confidence: "AI_ESTIMATE",
      checkedAt,
    };
  }
}

const WeatherEstimateSchema = z.object({
  avgHighC: z.number(),
  avgLowC: z.number(),
  rainyDays: z.number().int().min(0).max(31).nullable(),
  summary: z.string(),
});

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export class LLMEstimateWeatherProvider implements WeatherProvider {
  readonly name = "llm-estimate";
  async forMonth(q: WeatherQuery, ctx: ProviderContext): Promise<WeatherSummary | null> {
    if (llmMode() === "mock") return null;
    const out = await generateStructured({
      purpose: "weather-estimate",
      schema: WeatherEstimateSchema,
      system: ESTIMATOR_SYSTEM,
      effort: "low",
      maxTokens: 1500,
      ctx,
      prompt: `Typical climate in ${q.city}, ${countryName(q.country)} in ${MONTHS[q.month - 1]}: average daily high and low in °C, typical number of rainy days, and a one-sentence summary for a traveller (what to wear).`,
    });
    return {
      kind: "climate-average",
      ...out,
      source: "AI estimate of typical climate for the month",
    };
  }
}

/** Day generation already draws on the model's own knowledge, so there's nothing to add here. */
export class LLMEstimateActivityProvider implements ActivityProvider {
  readonly name = "llm-estimate";
  async ideas() {
    return null;
  }
}
