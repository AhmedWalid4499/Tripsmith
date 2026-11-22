import { describe, expect, it } from "vitest";
import { computeBudget } from "@/lib/budget";
import { convertMinor, MissingRateError, toMajor, toMinor } from "@/lib/money/convert";
import { formatMoney } from "@/lib/money/currencies";

const rates = { USD: 1, EUR: 0.9, EGP: 50, JPY: 150 };

describe("money", () => {
  it("respects each currency's minor units", () => {
    expect(toMinor(12.5, "USD")).toBe(1250);
    expect(toMinor(1200, "JPY")).toBe(1200); // yen has no minor unit
    expect(toMajor(1250, "EUR")).toBe(12.5);
  });

  it("converts through USD", () => {
    expect(convertMinor(15_000, "JPY", "USD", rates)).toBe(10_000); // ¥15,000 → $100.00
    expect(convertMinor(10_000, "USD", "EGP", rates)).toBe(500_000); // $100 → EGP 5,000.00
    expect(convertMinor(1234, "EUR", "EUR", rates)).toBe(1234);
  });

  it("fails loudly on unknown currencies", () => {
    expect(() => convertMinor(100, "XYZ", "USD", rates)).toThrow(MissingRateError);
  });

  it("formats with the right symbol and digits", () => {
    expect(formatMoney(150_000, "JPY")).toBe("¥150,000");
    expect(formatMoney(4250, "USD")).toBe("$42.50");
  });
});

describe("computeBudget", () => {
  it("adds up categories, applies the buffer and compares with the budget", () => {
    const b = computeBudget({
      travellers: 2,
      budgetMinor: 500_000, // $5,000
      budgetCurrency: "USD",
      displayCurrency: "USD",
      rates,
      flight: { priceMinor: 100_000, currency: "USD" }, // $1,000 pp
      hotels: [{ nightlyMinor: 15_000, currency: "JPY", nights: 4 }], // ¥15,000 = $100 / night
      items: [
        { type: "ACTIVITY", costMinor: 3000, currency: "JPY" }, // $20
        { type: "MEAL", costMinor: 6000, currency: "JPY" }, // $40
        { type: "TRANSPORT", costMinor: 1500, currency: "JPY" }, // $10
      ],
      visas: [{ costMinor: 9000, currency: "EUR" }], // €90 = $100 pp
      manualLines: [],
    });
    const byCat = Object.fromEntries(b.lines.map((l) => [l.category, l.amountMinor]));
    expect(byCat).toMatchObject({
      FLIGHTS: 200_000,
      HOTELS: 40_000,
      ACTIVITIES: 2000,
      FOOD: 4000,
      LOCAL_TRANSPORT: 1000,
      VISA: 20_000,
    });
    expect(b.subtotalMinor).toBe(267_000);
    expect(b.bufferMinor).toBe(26_700);
    expect(b.totalMinor).toBe(293_700);
    expect(b.remainingMinor).toBe(500_000 - 293_700);
  });

  it("converts the budget into the display currency", () => {
    const b = computeBudget({
      travellers: 1,
      budgetMinor: 5_000_000,
      budgetCurrency: "EGP",
      displayCurrency: "USD",
      rates,
      flight: null,
      hotels: [],
      items: [],
      visas: [],
      manualLines: [],
    });
    expect(b.budgetMinor).toBe(100_000); // EGP 50,000 → $1,000
  });
});
