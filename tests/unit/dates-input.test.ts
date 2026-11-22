import { describe, expect, it } from "vitest";
import { dueDateFor, dueState } from "@/lib/checklist";
import { inclusiveDays, resolveDates, TripInputSchema, WhenStep } from "@/lib/trip-input";

const valid = {
  surpriseMe: false,
  destination: "Tokyo",
  departureCity: "Cairo",
  dateMode: "dates" as const,
  startDate: "2030-04-10",
  endDate: "2030-04-16",
  lengthDays: 7,
  travellers: 2,
  budgetAmount: 3000,
  budgetCurrency: "USD" as const,
  style: "MID" as const,
  interests: ["food" as const],
  nationality: "eg",
};

describe("checklist deadlines", () => {
  it("counts back from departure", () => {
    const start = new Date("2030-04-10T00:00:00Z");
    expect(dueDateFor(start, 30)?.toISOString().slice(0, 10)).toBe("2030-03-11");
    expect(dueDateFor(null, 30)).toBeNull();
  });

  it("classifies urgency", () => {
    const today = new Date("2030-03-01T12:00:00Z");
    expect(dueState(new Date("2030-02-28T00:00:00Z"), false, today)).toBe("overdue");
    expect(dueState(new Date("2030-03-05T00:00:00Z"), false, today)).toBe("soon");
    expect(dueState(new Date("2030-04-01T00:00:00Z"), false, today)).toBe("later");
    expect(dueState(new Date("2030-02-28T00:00:00Z"), true, today)).toBe("none");
  });
});

describe("trip input", () => {
  it("accepts a complete trip and normalises the passport code", () => {
    const r = TripInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.nationality).toBe("EG");
    expect(resolveDates(r.data!).lengthDays).toBe(7);
  });

  it("requires a destination unless surprise me is on", () => {
    expect(TripInputSchema.safeParse({ ...valid, destination: "" }).success).toBe(false);
    expect(TripInputSchema.safeParse({ ...valid, destination: "", surpriseMe: true }).success).toBe(
      true,
    );
  });

  it("rejects past, reversed and over-long dates", () => {
    const when = (startDate: string, endDate: string) =>
      WhenStep.safeParse({ dateMode: "dates", startDate, endDate, lengthDays: 0 }).success;
    expect(when("2001-01-01", "2001-01-05")).toBe(false);
    expect(when("2030-04-10", "2030-04-01")).toBe(false);
    expect(when("2030-04-01", "2030-05-30")).toBe(false);
    expect(inclusiveDays("2030-04-10", "2030-04-10")).toBe(1);
  });

  it("rejects unknown passport countries", () => {
    expect(TripInputSchema.safeParse({ ...valid, nationality: "ZZ" }).success).toBe(false);
  });
});
