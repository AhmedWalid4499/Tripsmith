import { describe, expect, it } from "vitest";
import { retimeDay, type RetimeItem } from "@/lib/retime";

const item = (
  id: string,
  startTime: string,
  durationMin: number,
  prev: string | null,
  extra: Partial<RetimeItem> = {},
): RetimeItem => ({
  id,
  type: "ACTIVITY",
  startTime,
  durationMin,
  travelMinFromPrev: prev ? 10 : null,
  travelModeFromPrev: prev ? "10 min walk" : null,
  previousPredecessorId: prev,
  ...extra,
});

describe("retimeDay", () => {
  it("keeps an unchanged day's times and travel", () => {
    const out = retimeDay([item("a", "09:00", 60, null), item("b", "10:10", 90, "a")]);
    expect(out.map((o) => o.startTime)).toEqual(["09:00", "10:10"]);
    expect(out[1]!.travelModeFromPrev).toBe("10 min walk");
  });

  it("drops travel info when neighbours change and allows a default gap", () => {
    // b now comes first, a follows b (a never followed b before)
    const out = retimeDay([item("b", "10:10", 90, "a"), item("a", "09:00", 60, null)]);
    expect(out[0]).toMatchObject({
      id: "b",
      order: 0,
      startTime: "09:00",
      travelMinFromPrev: null,
    });
    expect(out[1]).toMatchObject({
      id: "a",
      order: 1,
      startTime: "10:50",
      travelModeFromPrev: null,
    }); // 09:00 + 90 + 20
  });

  it("keeps meals at their booked time unless pushed later", () => {
    const out = retimeDay([
      item("a", "09:00", 60, null),
      item("dinner", "19:00", 90, "a", { type: "MEAL" }),
      item("late", "21:00", 60, "dinner"),
    ]);
    expect(out.map((o) => o.startTime)).toEqual(["09:00", "19:00", "20:40"]);
    expect(out.map((o) => o.slot)).toEqual(["MORNING", "EVENING", "EVENING"]);
  });

  it("never runs past midnight", () => {
    const out = retimeDay([item("a", "22:00", 300, null), item("b", "23:00", 60, "a")]);
    expect(out[1]!.startTime).toBe("23:45");
  });
});
