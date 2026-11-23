import { toMinor } from "@/lib/money/convert";
import type { VisaProvider, VisaQuery, VisaQuote } from "@/server/providers/types";

/**
 * A small curated sample of visa rules for common routes. Every entry is labelled CURATED with
 * the date it was last reviewed, and the UI always shows the "verify before you travel" notice.
 * Missing pairs fall through to the LLM estimate (labelled AI_ESTIMATE).
 */
type Entry = Omit<VisaQuote, "checkedAt" | "confidence" | "cost"> & {
  cost: { major: number; currency: string } | null;
};

const REVIEWED_AT = new Date("2026-11-01T00:00:00Z");

const SCHENGEN_DOCS = [
  "Passport valid 3+ months beyond departure, issued within the last 10 years",
  "Completed Schengen visa application form",
  "Two recent passport photos",
  "Travel medical insurance covering at least EUR 30,000",
  "Return flight and accommodation reservations",
  "Bank statements for the last 3–6 months",
  "Employment letter or proof of studies",
];

const schengenRequired: Entry = {
  requirement: "VISA_REQUIRED",
  visaType: "Schengen short-stay visa (type C)",
  cost: { major: 90, currency: "EUR" },
  processingTime: "Usually about 15 days; apply up to 6 months ahead",
  maxStayDays: 90,
  documents: SCHENGEN_DOCS,
  notes: "Apply at the consulate or visa centre of the country where you'll spend the most nights.",
};

const schengenFree: Entry = {
  requirement: "NOT_REQUIRED",
  visaType: null,
  cost: null,
  processingTime: null,
  maxStayDays: 90,
  documents: ["Passport valid 3+ months beyond departure"],
  notes:
    "Visa-free for up to 90 days in any 180-day period across the Schengen area. Check whether the ETIAS travel authorisation is required by your travel date.",
};

const PAIRS: Record<string, Entry> = {
  // Egyptian passport
  "EG>JP": {
    requirement: "VISA_REQUIRED",
    visaType: "Temporary visitor visa (short-term stay)",
    cost: null,
    processingTime: "Around 5 working days after the embassy accepts the application",
    maxStayDays: 15,
    documents: [
      "Passport valid for the whole stay",
      "Visa application form and photo",
      "Flight reservation and day-by-day itinerary",
      "Hotel reservations",
      "Bank statement and employment letter",
    ],
    notes:
      "Apply at the Embassy of Japan in Cairo. Fees and stay length depend on the visa issued.",
  },
  "EG>FR": schengenRequired,
  "EG>IT": schengenRequired,
  "EG>ES": schengenRequired,
  "EG>GB": {
    requirement: "VISA_REQUIRED",
    visaType: "Standard Visitor visa",
    cost: { major: 127, currency: "GBP" },
    processingTime: "Usually about 3 weeks after your biometrics appointment",
    maxStayDays: 180,
    documents: [
      "Passport valid for the whole stay",
      "Online application and biometrics appointment",
      "Bank statements and proof of income",
      "Employment letter",
      "Accommodation and travel plans",
    ],
    notes: null,
  },
  "EG>TR": {
    requirement: "VISA_REQUIRED",
    visaType: "Tourist visa (consulate) or conditional e-Visa",
    cost: null,
    processingTime: "Varies; allow several weeks for a consulate visa",
    maxStayDays: 30,
    documents: [
      "Passport valid 6+ months",
      "Application form",
      "Hotel and return flight reservations",
      "Bank statements",
    ],
    notes:
      "An e-Visa is only available to Egyptian citizens who meet extra conditions (for example a valid Schengen, US, UK or Irish visa or residence permit). Otherwise apply at a Turkish consulate.",
  },
  "EG>AE": {
    requirement: "VISA_REQUIRED",
    visaType: "Tourist visa arranged before travel",
    cost: null,
    processingTime: "Typically a few working days",
    maxStayDays: 30,
    documents: ["Passport valid 6+ months", "Passport photo", "Return ticket", "Hotel booking"],
    notes:
      "Usually arranged through an airline, hotel or licensed agent. Some travellers with a valid US visa or UK/EU residence can get a visa on arrival.",
  },
  "EG>TH": {
    requirement: "E_VISA",
    visaType: "Tourist visa (e-Visa)",
    cost: null,
    processingTime: "Allow around 2 weeks",
    maxStayDays: 60,
    documents: ["Passport valid 6+ months", "Photo", "Flight and hotel bookings", "Bank statement"],
    notes: "Apply online through the official Thai e-Visa website.",
  },
  // US passport
  "US>JP": {
    requirement: "NOT_REQUIRED",
    visaType: null,
    cost: null,
    processingTime: null,
    maxStayDays: 90,
    documents: ["Passport valid for the whole stay", "Return or onward ticket"],
    notes: "Visa-free short stays for tourism.",
  },
  "US>FR": schengenFree,
  "US>IT": schengenFree,
  "US>ES": schengenFree,
  "US>GB": {
    requirement: "E_VISA",
    visaType: "Electronic Travel Authorisation (ETA)",
    cost: { major: 16, currency: "GBP" },
    processingTime: "Usually within 3 working days",
    maxStayDays: 180,
    documents: ["Passport", "Photo of your face", "Email address and payment card"],
    notes: "Apply through the official UK ETA app or GOV.UK before you travel.",
  },
  "US>TR": {
    requirement: "NOT_REQUIRED",
    visaType: null,
    cost: null,
    processingTime: null,
    maxStayDays: 90,
    documents: ["Passport valid 150+ days from arrival"],
    notes: "Visa-free for up to 90 days in any 180-day period.",
  },
  "US>AE": {
    requirement: "VISA_ON_ARRIVAL",
    visaType: "Visit visa on arrival",
    cost: null,
    processingTime: "On arrival",
    maxStayDays: 30,
    documents: ["Passport valid 6+ months"],
    notes: "Issued free on arrival.",
  },
  "US>TH": {
    requirement: "NOT_REQUIRED",
    visaType: null,
    cost: null,
    processingTime: null,
    maxStayDays: 30,
    documents: ["Passport valid 6+ months", "Onward ticket"],
    notes:
      "Visa exemption. The permitted length of stay has changed recently, so check it before you travel.",
  },
  // UK passport
  "GB>JP": {
    requirement: "NOT_REQUIRED",
    visaType: null,
    cost: null,
    processingTime: null,
    maxStayDays: 90,
    documents: ["Passport valid for the whole stay"],
    notes: "Visa-free short stays for tourism.",
  },
  "GB>FR": schengenFree,
  "GB>IT": schengenFree,
  "GB>ES": schengenFree,
  "GB>TR": {
    requirement: "NOT_REQUIRED",
    visaType: null,
    cost: null,
    processingTime: null,
    maxStayDays: 90,
    documents: ["Passport valid 150+ days from arrival"],
    notes: "Visa-free for up to 90 days in any 180-day period.",
  },
  "GB>AE": {
    requirement: "VISA_ON_ARRIVAL",
    visaType: "Visit visa on arrival",
    cost: null,
    processingTime: "On arrival",
    maxStayDays: 30,
    documents: ["Passport valid 6+ months"],
    notes: "Issued free on arrival.",
  },
  "GB>TH": {
    requirement: "NOT_REQUIRED",
    visaType: null,
    cost: null,
    processingTime: null,
    maxStayDays: 30,
    documents: ["Passport valid 6+ months", "Onward ticket"],
    notes:
      "Visa exemption. The permitted length of stay has changed recently, so check it before you travel.",
  },
};

export class MockVisaProvider implements VisaProvider {
  readonly name = "mock";
  async requirements({ nationality, destination }: VisaQuery): Promise<VisaQuote | null> {
    if (nationality === destination) {
      return {
        requirement: "NOT_REQUIRED",
        visaType: null,
        cost: null,
        processingTime: null,
        maxStayDays: null,
        documents: ["Valid national ID or passport"],
        notes: "You're travelling in your own country.",
        confidence: "CURATED",
        checkedAt: REVIEWED_AT,
      };
    }
    const entry = PAIRS[`${nationality}>${destination}`];
    if (!entry) return null;
    const { cost, ...rest } = entry;
    return {
      ...rest,
      cost: cost
        ? {
            amountMinor: toMinor(cost.major, cost.currency),
            currency: cost.currency,
            priceSource: "ESTIMATE",
            checkedAt: REVIEWED_AT,
          }
        : null,
      confidence: "CURATED",
      checkedAt: REVIEWED_AT,
    };
  }
}
