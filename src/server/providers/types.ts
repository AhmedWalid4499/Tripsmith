import type { PriceSource, TravelStyle, VisaRequirement } from "@/generated/prisma/enums";

/**
 * Provider contracts for live data. Each provider has a Mock* implementation (curated sample data)
 * and an LLMEstimate* fallback. Real APIs plug in later behind the *_PROVIDER env flags.
 *
 * Every price a provider returns says where it came from (`priceSource`) and when it was checked.
 * Amounts are integer minor units of `currency` (ISO 4217).
 */
export type Priced = {
  amountMinor: number;
  currency: string;
  priceSource: PriceSource;
  checkedAt: Date;
};

export type ProviderContext = {
  tripId?: string;
  jobId?: string;
  userId?: string | null;
};

// ── Flights ──────────────────────────────────────────────────────────
export type FlightQuery = {
  fromCity: string;
  toCity: string;
  toCountry: string;
  departDate: Date | null;
  returnDate: Date | null;
  travellers: number;
  style: TravelStyle;
};

export type FlightQuote = {
  fromCity: string;
  toCity: string;
  roundTrip: boolean;
  airline: string | null;
  stops: number | null;
  durationMin: number | null;
  /** Price per traveller. */
  price: Priced;
  notes: string | null;
};

export interface FlightProvider {
  readonly name: string;
  estimate(query: FlightQuery, ctx: ProviderContext): Promise<FlightQuote | null>;
}

// ── Hotels ───────────────────────────────────────────────────────────
export type HotelQuery = {
  city: string;
  country: string;
  nights: number;
  checkIn: Date | null;
  travellers: number;
  style: TravelStyle;
};

export type HotelQuote = {
  tier: TravelStyle;
  name: string;
  area: string;
  description: string | null;
  /** Price per night for the whole party (rooms needed for `travellers`). */
  nightly: Priced;
  rating: number | null;
  url: string | null;
};

export interface HotelProvider {
  readonly name: string;
  /** Returns 2–3 options at different price levels, or null if it has no data for the city. */
  options(query: HotelQuery, ctx: ProviderContext): Promise<HotelQuote[] | null>;
}

// ── Activities ───────────────────────────────────────────────────────
export type ActivityCategory =
  | "food"
  | "history"
  | "culture"
  | "art"
  | "nature"
  | "nightlife"
  | "shopping"
  | "beaches"
  | "adventure"
  | "wellness"
  | "family";

export type ActivityIdea = {
  name: string;
  categories: ActivityCategory[];
  area: string;
  description: string;
  durationMin: number;
  /** Typical cost per person in the city's local currency, major units (0 = free). */
  costPerPersonMajor: number;
  currency: string;
  bestSlot: "MORNING" | "AFTERNOON" | "EVENING" | "ANY";
  lat: number;
  lng: number;
  bookingTip?: string;
};

export type MealIdea = {
  name: string;
  area: string;
  description: string;
  slot: "MORNING" | "AFTERNOON" | "EVENING";
  /** Typical cost per person, local currency major units. */
  costPerPersonMajor: number;
  currency: string;
  tier: TravelStyle;
  lat: number;
  lng: number;
};

export interface ActivityProvider {
  readonly name: string;
  /** Curated ideas for a city, used to ground day generation. Null when the provider has no data. */
  ideas(
    city: string,
    country: string,
  ): Promise<{ activities: ActivityIdea[]; meals: MealIdea[] } | null>;
}

// ── Visa ─────────────────────────────────────────────────────────────
export type VisaQuery = { nationality: string; destination: string; stayDays: number };

export type VisaQuote = {
  requirement: VisaRequirement;
  visaType: string | null;
  cost: Priced | null;
  processingTime: string | null;
  maxStayDays: number | null;
  documents: string[];
  notes: string | null;
  /** CURATED: from the curated table. AI_ESTIMATE: model output, never presented as confirmed. */
  confidence: "CURATED" | "AI_ESTIMATE";
  checkedAt: Date;
};

export interface VisaProvider {
  readonly name: string;
  requirements(query: VisaQuery, ctx: ProviderContext): Promise<VisaQuote | null>;
}

// ── Weather ──────────────────────────────────────────────────────────
export type WeatherQuery = { city: string; country: string; month: number /* 1-12 */ };

export type WeatherSummary = {
  /** "climate-average" for typical conditions for the month; "forecast" for a real forecast. */
  kind: "climate-average" | "forecast";
  avgHighC: number;
  avgLowC: number;
  rainyDays: number | null;
  summary: string;
  source: string;
};

export interface WeatherProvider {
  readonly name: string;
  forMonth(query: WeatherQuery, ctx: ProviderContext): Promise<WeatherSummary | null>;
}

// ── FX ───────────────────────────────────────────────────────────────
export type FxRates = {
  /** Units of each currency per 1 USD. */
  rates: Record<string, number>;
  provider: string;
  priceSource: PriceSource;
  fetchedAt: Date;
};

export interface FxProvider {
  readonly name: string;
  latest(): Promise<FxRates>;
}
