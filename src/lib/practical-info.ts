import { z } from "zod";

/** Shape of Trip.practicalInfo (JSON column). Isomorphic so the UI can parse it too. */
export const WeatherInfoSchema = z.object({
  city: z.string(),
  kind: z.enum(["climate-average", "forecast"]),
  avgHighC: z.number(),
  avgLowC: z.number(),
  rainyDays: z.number().nullable(),
  summary: z.string(),
  source: z.string(),
});

export const PracticalInfoSchema = z.object({
  currency: z.object({ code: z.string(), name: z.string(), cashVsCard: z.string() }),
  language: z.string(),
  tipping: z.string(),
  safety: z.array(z.string()),
  localTransport: z.array(z.string()),
  bestAreas: z.array(
    z.object({ city: z.string(), areas: z.array(z.object({ name: z.string(), why: z.string() })) }),
  ),
  weather: z.array(WeatherInfoSchema),
  plugType: z.string(),
  emergencyNumber: z.string(),
  connectivity: z.string(),
});

export type PracticalInfo = z.infer<typeof PracticalInfoSchema>;
