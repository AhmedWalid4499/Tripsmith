import type { ActivityIdea, MealIdea } from "@/server/providers/types";
import type { DayItem, DayPlan, Outline } from "./schemas";

/** Everything the planner needs to know about the request. */
export type TripBrief = {
  destinationQuery: string;
  surpriseMe: boolean;
  departureCity: string;
  startDate: Date | null;
  endDate: Date | null;
  lengthDays: number;
  travellers: number;
  budgetMajor: number;
  budgetCurrency: string;
  style: "BUDGET" | "MID" | "LUXURY";
  interests: string[];
  nationality: string;
};

export type StopInfo = {
  city: string;
  country: string;
  currency: string;
  lat: number;
  lng: number;
};

export type DayContext = {
  brief: TripBrief;
  outline: Pick<Outline, "title" | "summary" | "stops">;
  dayNumber: number;
  dayTitle: string;
  dayTheme: string;
  stop: StopInfo;
  /** The previous stop when this is a travel day between cities. */
  fromStop: StopInfo | null;
  isArrivalDay: boolean;
  isDepartureDay: boolean;
  date: Date | null;
  weatherSummary: string | null;
  hotelArea: string | null;
  /** Titles of activities and meals already planned on other days, to avoid repeats. */
  alreadyPlanned: string[];
  /** Curated ideas for the city, when a provider has them. */
  ideas: { activities: ActivityIdea[]; meals: MealIdea[] } | null;
  /** Items the user locked; a regenerated day must keep them. */
  lockedItems: DayItem[];
};

export type PlannerContext = { tripId: string; jobId: string; userId: string | null };

export interface Planner {
  readonly name: string;
  outline(brief: TripBrief, ctx: PlannerContext): Promise<Outline>;
  day(day: DayContext, ctx: PlannerContext): Promise<DayPlan>;
}
