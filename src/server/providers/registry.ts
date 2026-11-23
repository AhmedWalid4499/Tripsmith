import "server-only";
import { env } from "@/server/env";
import {
  LLMEstimateActivityProvider,
  LLMEstimateFlightProvider,
  LLMEstimateHotelProvider,
  LLMEstimateVisaProvider,
  LLMEstimateWeatherProvider,
} from "@/server/providers/llm";
import {
  MockActivityProvider,
  MockFlightProvider,
  MockFxProvider,
  MockHotelProvider,
  MockVisaProvider,
  MockWeatherProvider,
} from "@/server/providers/mock";
import type {
  ActivityProvider,
  FlightProvider,
  FxProvider,
  HotelProvider,
  VisaProvider,
  WeatherProvider,
} from "@/server/providers/types";

/**
 * Picks providers from the *_PROVIDER env flags. "mock" = curated sample data, falling back to the
 * LLM estimate when the sample has nothing; "llm" = LLM estimate only. Real APIs get new flag values.
 */
type Flag = "mock" | "llm";

function flag(name: string, value: string): Flag {
  if (value === "mock" || value === "llm") return value;
  throw new Error(`Unknown ${name} "${value}". Supported: mock, llm.`);
}

/** Try each provider in order; the first non-null answer wins. */
function chain<P extends { name: string }, A extends unknown[], R>(
  providers: P[],
  call: (p: P, ...args: A) => Promise<R | null>,
) {
  return async (...args: A): Promise<{ value: R; provider: string } | null> => {
    for (const p of providers) {
      const value = await call(p, ...args);
      if (value !== null) return { value, provider: p.name };
    }
    return null;
  };
}

export function getProviders() {
  const e = env();
  const pick = <P>(name: string, value: string, mock: P, llm: P): P[] =>
    flag(name, value) === "mock" ? [mock, llm] : [llm];

  const flights = pick<FlightProvider>(
    "FLIGHT_PROVIDER",
    e.FLIGHT_PROVIDER,
    new MockFlightProvider(),
    new LLMEstimateFlightProvider(),
  );
  const hotels = pick<HotelProvider>(
    "HOTEL_PROVIDER",
    e.HOTEL_PROVIDER,
    new MockHotelProvider(),
    new LLMEstimateHotelProvider(),
  );
  const activities = pick<ActivityProvider>(
    "ACTIVITY_PROVIDER",
    e.ACTIVITY_PROVIDER,
    new MockActivityProvider(),
    new LLMEstimateActivityProvider(),
  );
  const visas = pick<VisaProvider>(
    "VISA_PROVIDER",
    e.VISA_PROVIDER,
    new MockVisaProvider(),
    new LLMEstimateVisaProvider(),
  );
  const weather = pick<WeatherProvider>(
    "WEATHER_PROVIDER",
    e.WEATHER_PROVIDER,
    new MockWeatherProvider(),
    new LLMEstimateWeatherProvider(),
  );
  flag("FX_PROVIDER", e.FX_PROVIDER);
  const fx: FxProvider = new MockFxProvider(); // No LLM fallback for FX: rates must come from data.

  return {
    flight: chain(flights, (p, ...a: Parameters<FlightProvider["estimate"]>) => p.estimate(...a)),
    hotels: chain(hotels, (p, ...a: Parameters<HotelProvider["options"]>) => p.options(...a)),
    activityIdeas: chain(activities, (p, ...a: Parameters<ActivityProvider["ideas"]>) =>
      p.ideas(...a),
    ),
    visa: chain(visas, (p, ...a: Parameters<VisaProvider["requirements"]>) => p.requirements(...a)),
    weather: chain(weather, (p, ...a: Parameters<WeatherProvider["forMonth"]>) => p.forMonth(...a)),
    fx: () => fx.latest(),
  };
}

export type Providers = ReturnType<typeof getProviders>;
