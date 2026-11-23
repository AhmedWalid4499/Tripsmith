import { convertMinor, type RateTable } from "@/lib/money/convert";

export type BudgetCategory =
  "FLIGHTS" | "HOTELS" | "ACTIVITIES" | "FOOD" | "LOCAL_TRANSPORT" | "VISA" | "BUFFER" | "OTHER";

export const BUDGET_LABELS: Record<BudgetCategory, string> = {
  FLIGHTS: "Flights",
  HOTELS: "Hotels",
  ACTIVITIES: "Activities",
  FOOD: "Food & drink",
  LOCAL_TRANSPORT: "Getting around",
  VISA: "Visas",
  BUFFER: "Buffer",
  OTHER: "Other",
};

export type BudgetInput = {
  travellers: number;
  budgetMinor: number;
  budgetCurrency: string;
  displayCurrency: string;
  rates: RateTable;
  /** Selected flight; price is per traveller. */
  flight: { priceMinor: number; currency: string } | null;
  /** Selected hotel per stop; price is per night for the party. */
  hotels: { nightlyMinor: number; currency: string; nights: number }[];
  items: {
    type: "ACTIVITY" | "MEAL" | "TRANSPORT" | "HOTEL";
    costMinor: number;
    currency: string;
  }[];
  /** Visa cost per traveller, per destination. */
  visas: { costMinor: number | null; currency: string | null }[];
  manualLines: { category: BudgetCategory; amountMinor: number; currency: string }[];
  /** Share of planned spend added as a contingency buffer. */
  bufferRate?: number;
};

export type BudgetBreakdown = {
  currency: string;
  lines: { category: BudgetCategory; label: string; amountMinor: number }[];
  subtotalMinor: number;
  bufferMinor: number;
  totalMinor: number;
  budgetMinor: number;
  /** Positive = under budget, negative = over. */
  remainingMinor: number;
  /** total / budget, e.g. 0.85 */
  usage: number;
};

/** All budget totals are computed from the plan, never stored. Everything converts via the trip's FX snapshot. */
export function computeBudget(input: BudgetInput): BudgetBreakdown {
  const to = input.displayCurrency;
  const conv = (minor: number, from: string) => convertMinor(minor, from, to, input.rates);
  const sums: Record<BudgetCategory, number> = {
    FLIGHTS: 0,
    HOTELS: 0,
    ACTIVITIES: 0,
    FOOD: 0,
    LOCAL_TRANSPORT: 0,
    VISA: 0,
    BUFFER: 0,
    OTHER: 0,
  };

  if (input.flight)
    sums.FLIGHTS += conv(input.flight.priceMinor, input.flight.currency) * input.travellers;
  for (const h of input.hotels) sums.HOTELS += conv(h.nightlyMinor, h.currency) * h.nights;
  for (const i of input.items) {
    const cat =
      i.type === "MEAL"
        ? "FOOD"
        : i.type === "TRANSPORT"
          ? "LOCAL_TRANSPORT"
          : i.type === "HOTEL"
            ? "HOTELS"
            : "ACTIVITIES";
    sums[cat] += conv(i.costMinor, i.currency);
  }
  for (const v of input.visas) {
    if (v.costMinor && v.currency) sums.VISA += conv(v.costMinor, v.currency) * input.travellers;
  }
  for (const m of input.manualLines) sums[m.category] += conv(m.amountMinor, m.currency);

  const subtotalMinor = Object.values(sums).reduce((a, b) => a + b, 0);
  const bufferMinor = Math.round(subtotalMinor * (input.bufferRate ?? 0.1));
  const totalMinor = subtotalMinor + bufferMinor;
  const budgetMinor = conv(input.budgetMinor, input.budgetCurrency);

  const order: BudgetCategory[] = [
    "FLIGHTS",
    "HOTELS",
    "ACTIVITIES",
    "FOOD",
    "LOCAL_TRANSPORT",
    "VISA",
    "OTHER",
  ];
  return {
    currency: to,
    lines: [
      ...order
        .filter((c) => sums[c] > 0)
        .map((c) => ({ category: c, label: BUDGET_LABELS[c], amountMinor: sums[c] })),
      { category: "BUFFER" as const, label: BUDGET_LABELS.BUFFER, amountMinor: bufferMinor },
    ],
    subtotalMinor,
    bufferMinor,
    totalMinor,
    budgetMinor,
    remainingMinor: budgetMinor - totalMinor,
    usage: budgetMinor > 0 ? totalMinor / budgetMinor : 0,
  };
}
