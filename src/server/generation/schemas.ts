import { z } from "zod";

/**
 * What the model returns. Prefer `.nullable()` over `.optional()` for model output: structured
 * outputs require every property, so "no value" must be explicit. Business rules (nights summing
 * to the trip length, day numbering) are enforced in code after parsing, not trusted from the model.
 */

export const ChecklistCategoryEnum = z.enum([
  "VISA",
  "BOOKINGS",
  "INSURANCE",
  "CONNECTIVITY",
  "MONEY",
  "HEALTH",
  "PACKING",
  "OTHER",
]);

export const OutlineSchema = z.object({
  title: z.string().describe('Short trip title, e.g. "9 days in Japan: Tokyo & Kyoto"'),
  summary: z.string().describe("Two sentences describing the trip's shape and highlights"),
  stops: z
    .array(
      z.object({
        city: z.string(),
        country: z.string().length(2).describe("ISO 3166-1 alpha-2 code"),
        nights: z.number().int().min(0),
        summary: z.string().describe("One sentence on why this stop"),
        lat: z.number(),
        lng: z.number(),
        currency: z.string().length(3).describe("ISO 4217 local currency"),
      }),
    )
    .min(1)
    .max(6),
  days: z
    .array(
      z.object({
        dayNumber: z.number().int().min(1),
        stopIndex: z.number().int().min(0).describe("Index into stops"),
        title: z.string().describe('e.g. "Old Delhi markets and Mughal monuments"'),
        theme: z.string().describe("One sentence on the day's focus and pace"),
      }),
    )
    .min(1),
  practical: z.object({
    currencyName: z.string(),
    cashVsCard: z.string(),
    language: z.string(),
    tipping: z.string(),
    safety: z.array(z.string()).max(5),
    localTransport: z.array(z.string()).max(5),
    bestAreas: z.array(
      z.object({
        city: z.string(),
        areas: z.array(z.object({ name: z.string(), why: z.string() })).max(3),
      }),
    ),
    plugType: z.string(),
    emergencyNumber: z.string(),
    connectivity: z.string().describe("SIM/eSIM options for visitors"),
  }),
  checklist: z
    .array(
      z.object({
        category: ChecklistCategoryEnum,
        title: z.string(),
        description: z.string().nullable(),
        daysBeforeDeparture: z
          .number()
          .int()
          .min(0)
          .nullable()
          .describe("Do this at least N days before departure; null if it can be done any time"),
      }),
    )
    .min(4)
    .max(20),
});
export type Outline = z.infer<typeof OutlineSchema>;

export const DayItemSchema = z.object({
  type: z.enum(["ACTIVITY", "MEAL", "TRANSPORT"]),
  slot: z.enum(["MORNING", "AFTERNOON", "EVENING"]),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .describe("Local time HH:MM"),
  durationMin: z.number().int().min(0),
  travelMinFromPrev: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe("Minutes to get here from the previous item; null for the first item"),
  travelModeFromPrev: z.string().nullable().describe('e.g. "12 min walk", "Metro line 1"'),
  title: z.string(),
  description: z.string().describe("One or two practical sentences"),
  location: z.string().describe("Place name and neighbourhood"),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  costTotalMajor: z
    .number()
    .min(0)
    .describe("Estimated total cost for the whole party, in `currency`, major units"),
  currency: z.string().length(3),
  bookingTip: z.string().nullable(),
});

export const DayPlanSchema = z.object({
  title: z.string(),
  summary: z.string(),
  items: z.array(DayItemSchema).min(2).max(10),
});
export type DayPlan = z.infer<typeof DayPlanSchema>;
export type DayItem = z.infer<typeof DayItemSchema>;
