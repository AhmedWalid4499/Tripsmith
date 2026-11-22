/**
 * Display currencies the app supports. Must match the Prisma `Currency` enum.
 * Source prices may be in any ISO 4217 code; they are converted for display via lib/money.
 */
export const DISPLAY_CURRENCIES = ["USD", "EUR", "EGP"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<DisplayCurrency, string> = {
  USD: "US dollar",
  EUR: "Euro",
  EGP: "Egyptian pound",
};

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return (DISPLAY_CURRENCIES as readonly string[]).includes(value);
}

/** Number of minor-unit digits for a currency (JPY = 0, USD = 2, KWD = 3). */
export function minorUnitDigits(currency: string): number {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

export function formatMoney(
  amountMinor: number,
  currency: string,
  opts: { locale?: string; compact?: boolean } = {},
): string {
  const digits = minorUnitDigits(currency);
  const major = amountMinor / 10 ** digits;
  return new Intl.NumberFormat(opts.locale ?? "en", {
    style: "currency",
    currency,
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact || major >= 100 ? 0 : digits,
  }).format(major);
}
