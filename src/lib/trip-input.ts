import { z } from "zod";
import { DISPLAY_CURRENCIES } from "@/lib/money/currencies";
import { isCountryCode } from "@/lib/countries";

export const INTERESTS = [
  { id: "food", label: "Food & drink" },
  { id: "history", label: "History" },
  { id: "culture", label: "Culture" },
  { id: "art", label: "Art & museums" },
  { id: "nature", label: "Nature" },
  { id: "nightlife", label: "Nightlife" },
  { id: "shopping", label: "Shopping" },
  { id: "beaches", label: "Beaches" },
  { id: "adventure", label: "Adventure" },
  { id: "wellness", label: "Wellness" },
  { id: "family", label: "Family-friendly" },
] as const;

export type InterestId = (typeof INTERESTS)[number]["id"];
const INTEREST_IDS = INTERESTS.map((i) => i.id) as [InterestId, ...InterestId[]];

export const TRAVEL_STYLES = [
  { id: "BUDGET", label: "Budget", hint: "Hostels and guesthouses, street food, public transport" },
  { id: "MID", label: "Mid-range", hint: "Comfortable hotels, sit-down meals, the odd taxi" },
  { id: "LUXURY", label: "Luxury", hint: "Top hotels, fine dining, private transfers" },
] as const;

export const MAX_TRIP_DAYS = 21;
export const MAX_TRAVELLERS = 12;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Use a valid date.");

/** Days between two YYYY-MM-DD dates, inclusive of both ends. */
export function inclusiveDays(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** Today's date as YYYY-MM-DD in UTC. */
export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Shared by the multi-step form (client) and createTripAction (server).
 * Step schemas let the form validate one step at a time with the same rules.
 */
export const WhereStep = z
  .object({
    surpriseMe: z.boolean(),
    destination: z.string().trim().max(120, "Keep it under 120 characters."),
    departureCity: z
      .string()
      .trim()
      .min(2, "Where are you leaving from?")
      .max(80, "Keep it under 80 characters."),
  })
  .superRefine((v, ctx) => {
    if (!v.surpriseMe && v.destination.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["destination"],
        message: "Where would you like to go? Or choose “Surprise me”.",
      });
    }
  });

export const WhenStep = z
  .object({
    dateMode: z.enum(["dates", "length"]),
    startDate: z.string(),
    endDate: z.string(),
    lengthDays: z.coerce.number().int(),
  })
  .superRefine((v, ctx) => {
    if (v.dateMode === "length") {
      if (!(v.lengthDays >= 1 && v.lengthDays <= MAX_TRIP_DAYS)) {
        ctx.addIssue({
          code: "custom",
          path: ["lengthDays"],
          message: `Choose between 1 and ${MAX_TRIP_DAYS} days.`,
        });
      }
      return;
    }
    const start = isoDate.safeParse(v.startDate);
    const end = isoDate.safeParse(v.endDate);
    if (!start.success)
      ctx.addIssue({ code: "custom", path: ["startDate"], message: "Choose a start date." });
    if (!end.success)
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "Choose an end date." });
    if (!start.success || !end.success) return;
    if (v.startDate < todayIso()) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "The trip can't start in the past.",
      });
    }
    const days = inclusiveDays(v.startDate, v.endDate);
    if (days < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "The end date must be after the start.",
      });
    } else if (days > MAX_TRIP_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: `Trips can be up to ${MAX_TRIP_DAYS} days for now.`,
      });
    }
  });

export const WhoStep = z.object({
  travellers: z.coerce
    .number()
    .int()
    .min(1, "At least one traveller.")
    .max(MAX_TRAVELLERS, `Up to ${MAX_TRAVELLERS} travellers.`),
  budgetAmount: z.coerce
    .number({ message: "Enter a budget." })
    .positive("Enter a budget greater than zero.")
    .max(100_000_000, "That budget is too large."),
  budgetCurrency: z.enum(DISPLAY_CURRENCIES),
  style: z.enum(["BUDGET", "MID", "LUXURY"]),
});

export const InterestsStep = z.object({
  interests: z
    .array(z.enum(INTEREST_IDS))
    .min(1, "Pick at least one interest.")
    .max(6, "Pick up to six."),
});

export const PassportStep = z.object({
  nationality: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v): boolean => isCountryCode(v), "Choose your passport country."),
});

export const TRIP_FORM_STEPS = [
  { id: "where", title: "Where", schema: WhereStep },
  { id: "when", title: "When", schema: WhenStep },
  { id: "who", title: "Who & budget", schema: WhoStep },
  { id: "interests", title: "Interests", schema: InterestsStep },
  { id: "passport", title: "Passport", schema: PassportStep },
] as const;

export const TripInputSchema = z
  .object({
    ...WhereStep.shape,
    ...WhenStep.shape,
    ...WhoStep.shape,
    ...InterestsStep.shape,
    ...PassportStep.shape,
  })
  .superRefine((v, ctx) => {
    for (const step of [WhereStep, WhenStep]) {
      const r = step.safeParse(v);
      if (!r.success)
        for (const issue of r.error.issues) ctx.addIssue({ ...issue, code: "custom" });
    }
  });

export type TripInput = z.infer<typeof TripInputSchema>;

/** Normalised trip length and dates from validated input. */
export function resolveDates(
  input: Pick<TripInput, "dateMode" | "startDate" | "endDate" | "lengthDays">,
) {
  if (input.dateMode === "dates") {
    return {
      startDate: new Date(`${input.startDate}T00:00:00Z`),
      endDate: new Date(`${input.endDate}T00:00:00Z`),
      lengthDays: inclusiveDays(input.startDate, input.endDate),
    };
  }
  return { startDate: null, endDate: null, lengthDays: input.lengthDays };
}
