import type { FxProvider, FxRates } from "@/server/providers/types";

/**
 * Static sample rates (units per 1 USD), labelled ESTIMATE. Replace with a live FX API behind
 * FX_PROVIDER for real use. Values are rounded mid-market approximations.
 */
export const SAMPLE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  EGP: 49.5,
  GBP: 0.78,
  JPY: 152,
  CNY: 7.2,
  KRW: 1380,
  THB: 35.5,
  VND: 25400,
  IDR: 15900,
  MYR: 4.45,
  SGD: 1.34,
  PHP: 57.5,
  INR: 84.5,
  LKR: 298,
  NPR: 135,
  AED: 3.6725,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.307,
  OMR: 0.385,
  JOD: 0.709,
  ILS: 3.7,
  LBP: 89500,
  TRY: 41.5,
  GEL: 2.7,
  MAD: 9.9,
  TND: 3.1,
  KES: 129,
  TZS: 2650,
  ZAR: 18.2,
  CHF: 0.88,
  NOK: 10.9,
  SEK: 10.6,
  DKK: 6.87,
  ISK: 137,
  PLN: 3.95,
  CZK: 23.2,
  HUF: 365,
  RON: 4.58,
  BGN: 1.8,
  RSD: 108,
  AUD: 1.52,
  NZD: 1.68,
  CAD: 1.38,
  MXN: 18.4,
  BRL: 5.6,
  ARS: 1150,
  CLP: 940,
  COP: 4100,
  PEN: 3.75,
  HKD: 7.8,
  TWD: 32.2,
};

export class MockFxProvider implements FxProvider {
  readonly name = "mock";
  async latest(): Promise<FxRates> {
    return {
      rates: SAMPLE_RATES,
      provider: this.name,
      priceSource: "ESTIMATE",
      fetchedAt: new Date(),
    };
  }
}
