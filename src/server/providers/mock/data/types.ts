import type { ActivityIdea, MealIdea } from "@/server/providers/types";

export type HotelSample = {
  tier: "BUDGET" | "MID" | "LUXURY";
  name: string;
  area: string;
  description: string;
  /** Typical nightly price for a double room, local currency major units. */
  nightlyMajor: number;
  rating: number;
};

/** Average high/low °C and rainy days for each month, index 0 = January. */
export type MonthlyClimate = { highC: number; lowC: number; rainyDays: number }[];

export type CitySample = {
  /** Display name, e.g. "Kyoto". */
  city: string;
  /** Lower-case alternative spellings used for matching user input, e.g. ["kyōto"]. */
  aliases: string[];
  country: string; // ISO alpha-2
  currency: string; // ISO 4217
  lat: number;
  lng: number;
  /** Main airport IATA code, for flight estimates. */
  airport: string;
  summary: string;
  bestAreas: { name: string; why: string }[];
  activities: ActivityIdea[];
  meals: MealIdea[];
  hotels: HotelSample[];
  climate: MonthlyClimate;
};

export type CountrySample = {
  country: string; // ISO alpha-2
  currency: string;
  currencyName: string;
  language: string;
  tipping: string;
  safety: string[];
  localTransport: string[];
  cashVsCard: string;
  plugType: string;
  emergencyNumber: string;
  connectivity: string;
  /** Typical local transport cost per person per day, local currency major units. */
  dailyTransportMajor: number;
};
