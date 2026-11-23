import { minorUnitDigits } from "@/lib/money/currencies";

/** Units of each currency per 1 USD. Must include USD = 1. */
export type RateTable = Record<string, number>;

export class MissingRateError extends Error {
  constructor(public readonly currency: string) {
    super(`No exchange rate for ${currency}`);
    this.name = "MissingRateError";
  }
}

export function toMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** minorUnitDigits(currency));
}

export function toMajor(minor: number, currency: string): number {
  return minor / 10 ** minorUnitDigits(currency);
}

/**
 * Convert an amount in minor units between currencies using a USD-based rate table.
 * The single place in the app where currency maths happens.
 */
export function convertMinor(
  amountMinor: number,
  from: string,
  to: string,
  rates: RateTable,
): number {
  if (from === to) return amountMinor;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate) throw new MissingRateError(from);
  if (!toRate) throw new MissingRateError(to);
  const usd = toMajor(amountMinor, from) / fromRate;
  return toMinor(usd * toRate, to);
}

export type Money = { amountMinor: number; currency: string };

/** Sum amounts in mixed currencies into one target currency. */
export function sumMinor(items: Money[], to: string, rates: RateTable): number {
  return items.reduce((total, m) => total + convertMinor(m.amountMinor, m.currency, to, rates), 0);
}
