import { describe, expect, it } from "vitest";
import { normalizeOutline } from "@/server/generation/normalize";
import { MockDestinationError, mockPlanner } from "@/server/generation/mock-planner";
import type { Outline } from "@/server/generation/schemas";
import type { TripBrief } from "@/server/generation/types";

const ctx = { tripId: "t", jobId: "j", userId: null };
const brief: TripBrief = {
  destinationQuery: "Tokyo, Kyoto",
  surpriseMe: false,
  departureCity: "Cairo",
  startDate: new Date("2030-04-10T00:00:00Z"),
  endDate: new Date("2030-04-16T00:00:00Z"),
  lengthDays: 7,
  travellers: 2,
  budgetMajor: 4000,
  budgetCurrency: "USD",
  style: "MID",
  interests: ["food", "history"],
  nationality: "EG",
};

describe("normalizeOutline", () => {
  const base = (nights: number[], days: number): Outline =>
    ({
      title: "t",
      summary: "s",
      stops: nights.map((n, i) => ({
        city: `C${i}`,
        country: "jp",
        nights: n,
        summary: "",
        lat: 0,
        lng: 0,
        currency: "jpy",
      })),
      days: Array.from({ length: days }, (_, i) => ({
        dayNumber: i + 1,
        stopIndex: 9,
        title: "",
        theme: "",
      })),
      practical: {} as Outline["practical"],
      checklist: [],
    }) as Outline;

  it("forces nights to add up to length - 1 and fixes the day count", () => {
    const o = normalizeOutline(base([5, 5], 4), 7);
    expect(o.stops.reduce((n, s) => n + s.nights, 0)).toBe(6);
    expect(o.days.map((d) => d.dayNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(o.days.every((d) => d.stopIndex === 1)).toBe(true); // clamped into range
    expect(o.stops[0]!.country).toBe("JP");
    expect(o.stops[0]!.currency).toBe("JPY");
  });
});

describe("mock planner", () => {
  it("builds a two-city outline with consistent nights and days", async () => {
    const o = await mockPlanner.outline(brief, ctx);
    expect(o.stops.map((s) => s.city)).toEqual(["Tokyo", "Kyoto"]);
    expect(o.stops.reduce((n, s) => n + s.nights, 0)).toBe(6);
    expect(o.days).toHaveLength(7);
    expect(o.checklist.some((c) => c.category === "VISA")).toBe(true);
  });

  it("plans a day with meals, in time order, without repeating earlier picks", async () => {
    const o = await mockPlanner.outline(brief, ctx);
    const { MockActivityProvider } = await import("@/server/providers/mock");
    const ideas = await new MockActivityProvider().ideas("Tokyo", "JP");
    const day = await mockPlanner.day(
      {
        brief,
        outline: o,
        dayNumber: 2,
        dayTitle: "Tokyo",
        dayTheme: "",
        fromStop: null,
        stop: { city: "Tokyo", country: "JP", currency: "JPY", lat: 35.68, lng: 139.76 },
        isArrivalDay: false,
        isDepartureDay: false,
        date: null,
        weatherSummary: null,
        hotelArea: null,
        alreadyPlanned: ["Meiji Jingu Shrine"],
        ideas,
        lockedItems: [],
      },
      ctx,
    );
    expect(day.items.filter((i) => i.type === "MEAL").length).toBeGreaterThanOrEqual(2);
    expect(day.items.map((i) => i.title)).not.toContain("Meiji Jingu Shrine");
    const times = day.items.map((i) => i.startTime ?? "");
    expect([...times].sort()).toEqual(times);
  });

  it("explains which destinations sample mode knows", async () => {
    await expect(
      mockPlanner.outline({ ...brief, destinationQuery: "Atlantis" }, ctx),
    ).rejects.toThrow(MockDestinationError);
  });
});
