import { convertMinor, MissingRateError, type RateTable } from "@/lib/money/convert";
import { formatMoney } from "@/lib/money/currencies";

export type MoneyFormatter = {
  currency: string;
  /** Amount converted to the display currency. */
  convert(amountMinor: number, from: string): number;
  /** Formatted in the display currency, e.g. "$42". */
  format(amountMinor: number, from: string): string;
  /** Formatted with the original amount when it differs, e.g. "$42 · ¥6,000". */
  formatWithOriginal(amountMinor: number, from: string): string;
};

export function moneyFormatter(rates: RateTable, displayCurrency: string): MoneyFormatter {
  const convert = (amountMinor: number, from: string) => {
    try {
      return convertMinor(amountMinor, from, displayCurrency, rates);
    } catch (error) {
      if (error instanceof MissingRateError) return Number.NaN;
      throw error;
    }
  };
  const format = (amountMinor: number, from: string) => {
    const converted = convert(amountMinor, from);
    return Number.isNaN(converted)
      ? formatMoney(amountMinor, from)
      : formatMoney(converted, displayCurrency);
  };
  return {
    currency: displayCurrency,
    convert,
    format,
    formatWithOriginal(amountMinor, from) {
      if (from === displayCurrency || amountMinor === 0) return format(amountMinor, from);
      return `${format(amountMinor, from)} · ${formatMoney(amountMinor, from)}`;
    },
  };
}
