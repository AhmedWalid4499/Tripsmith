import { toMinor } from "@/lib/money/convert";
import type {
  ActivityProvider,
  FlightProvider,
  FlightQuery,
  FlightQuote,
  HotelProvider,
  HotelQuery,
  HotelQuote,
  WeatherProvider,
  WeatherQuery,
  WeatherSummary,
} from "@/server/providers/types";
import { distanceKm, findCityPoint, findCitySample } from "./data/lookup";

export { MockFxProvider } from "./fx";
export { MockVisaProvider } from "./visa";

/** Rooms needed for a party, assuming doubles. */
export function roomsFor(travellers: number) {
  return Math.max(1, Math.ceil(travellers / 2));
}

export class MockHotelProvider implements HotelProvider {
  readonly name = "mock";
  async options(q: HotelQuery): Promise<HotelQuote[] | null> {
    const city = findCitySample(q.city, q.country);
    if (!city) return null;
    const rooms = roomsFor(q.travellers);
    const checkedAt = new Date();
    return city.hotels.map((h) => ({
      tier: h.tier,
      name: h.name,
      area: h.area,
      description: h.description,
      nightly: {
        amountMinor: toMinor(h.nightlyMajor * rooms, city.currency),
        currency: city.currency,
        priceSource: "ESTIMATE",
        checkedAt,
      },
      rating: h.rating,
      url: null,
    }));
  }
}

const STYLE_FARE_MULTIPLIER = { BUDGET: 0.85, MID: 1, LUXURY: 3.4 } as const;

/** Distance-based fare model. Round-trip price per traveller in USD. */
export function estimateFareUsd(
  km: number,
  style: keyof typeof STYLE_FARE_MULTIPLIER,
  roundTrip = true,
) {
  const oneWay = 60 + 0.07 * km;
  return Math.round(oneWay * (roundTrip ? 1.7 : 1) * STYLE_FARE_MULTIPLIER[style]);
}

export class MockFlightProvider implements FlightProvider {
  readonly name = "mock";
  async estimate(q: FlightQuery): Promise<FlightQuote | null> {
    const from = findCityPoint(q.fromCity);
    const to = findCityPoint(q.toCity);
    if (!from || !to) return null;
    const km = distanceKm(from, to);
    const stops = km > 7000 ? 1 : 0;
    const durationMin = Math.round((km / 820) * 60 + 40 + stops * 150);
    const cabin = q.style === "LUXURY" ? "business" : "economy";
    return {
      fromCity: `${q.fromCity} (${from.airport})`,
      toCity: `${q.toCity} (${to.airport})`,
      roundTrip: true,
      airline: null,
      stops,
      durationMin,
      price: {
        amountMinor: toMinor(estimateFareUsd(km, q.style), "USD"),
        currency: "USD",
        priceSource: "ESTIMATE",
        checkedAt: new Date(),
      },
      notes: `Typical ${cabin} round-trip fare for about ${Math.round(km).toLocaleString("en")} km, estimated from distance. Check a flight search site for live prices.`,
    };
  }
}

export class MockActivityProvider implements ActivityProvider {
  readonly name = "mock";
  async ideas(city: string, country: string) {
    const sample = findCitySample(city, country);
    return sample ? { activities: sample.activities, meals: sample.meals } : null;
  }
}

function describeClimate(high: number, low: number, rainyDays: number): string {
  const feel =
    high >= 32 ? "Hot" : high >= 26 ? "Warm" : high >= 19 ? "Mild" : high >= 11 ? "Cool" : "Cold";
  const wet = rainyDays >= 12 ? "often rainy" : rainyDays >= 7 ? "some rainy days" : "mostly dry";
  return `${feel} and ${wet}: highs around ${high}°C, lows around ${low}°C, about ${rainyDays} rainy days in the month.`;
}

export class MockWeatherProvider implements WeatherProvider {
  readonly name = "mock";
  async forMonth(q: WeatherQuery): Promise<WeatherSummary | null> {
    const city = findCitySample(q.city, q.country);
    const m = city?.climate[q.month - 1];
    if (!city || !m) return null;
    return {
      kind: "climate-average",
      avgHighC: m.highC,
      avgLowC: m.lowC,
      rainyDays: m.rainyDays,
      summary: describeClimate(m.highC, m.lowC, m.rainyDays),
      source: "Typical climate for the month (long-term averages)",
    };
  }
}
