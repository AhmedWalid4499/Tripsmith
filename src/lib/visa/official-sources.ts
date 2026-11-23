/**
 * Official government sources for visa and entry rules, keyed by DESTINATION country.
 * This is the ONLY place visa links come from. Never use URLs from model output.
 *
 * Review this table regularly: portals move. Where a country has no entry, the UI tells the
 * traveller to check the destination's embassy or consulate instead of showing a link.
 */
export type OfficialSource = { name: string; url: string };

const EU_SCHENGEN: OfficialSource = {
  name: "European Commission: Schengen visa policy",
  url: "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en",
};

export const OFFICIAL_VISA_SOURCES: Record<string, OfficialSource> = {
  JP: {
    name: "Ministry of Foreign Affairs of Japan: Visa",
    url: "https://www.mofa.go.jp/j_info/visit/visa/index.html",
  },
  GB: { name: "GOV.UK: Check if you need a UK visa", url: "https://www.gov.uk/check-uk-visa" },
  US: {
    name: "U.S. Department of State: U.S. Visas",
    url: "https://travel.state.gov/content/travel/en/us-visas.html",
  },
  CA: {
    name: "Government of Canada: Visit Canada",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html",
  },
  AU: {
    name: "Australian Department of Home Affairs: Visas",
    url: "https://immi.homeaffairs.gov.au",
  },
  FR: {
    name: "France-Visas (official visa website for France)",
    url: "https://france-visas.gouv.fr",
  },
  IT: {
    name: "Visto per l'Italia (Italian Ministry of Foreign Affairs)",
    url: "https://vistoperitalia.esteri.it",
  },
  DE: {
    name: "German Federal Foreign Office: Visa",
    url: "https://www.auswaertiges-amt.de/en/visa-service",
  },
  ES: EU_SCHENGEN,
  NL: EU_SCHENGEN,
  BE: EU_SCHENGEN,
  AT: EU_SCHENGEN,
  PT: EU_SCHENGEN,
  GR: EU_SCHENGEN,
  CH: EU_SCHENGEN,
  CZ: EU_SCHENGEN,
  HU: EU_SCHENGEN,
  PL: EU_SCHENGEN,
  HR: EU_SCHENGEN,
  SE: EU_SCHENGEN,
  DK: EU_SCHENGEN,
  NO: EU_SCHENGEN,
  FI: EU_SCHENGEN,
  IS: EU_SCHENGEN,
  MT: EU_SCHENGEN,
  SI: EU_SCHENGEN,
  SK: EU_SCHENGEN,
  EE: EU_SCHENGEN,
  LV: EU_SCHENGEN,
  LT: EU_SCHENGEN,
  LU: EU_SCHENGEN,
  TR: { name: "Republic of Türkiye: Electronic Visa Application", url: "https://www.evisa.gov.tr" },
  AE: {
    name: "UAE Federal Authority for Identity, Citizenship, Customs and Port Security",
    url: "https://icp.gov.ae",
  },
  SA: { name: "Saudi Arabia: Visit Saudi eVisa", url: "https://visa.visitsaudi.com" },
  EG: { name: "Egypt e-Visa Portal", url: "https://visa2egypt.gov.eg" },
  MA: { name: "Morocco: Électronique Visa (acces-maroc)", url: "https://www.acces-maroc.ma" },
  TH: { name: "Thailand e-Visa (Ministry of Foreign Affairs)", url: "https://www.thaievisa.go.th" },
  ID: {
    name: "Indonesia Directorate General of Immigration: e-Visa",
    url: "https://evisa.imigrasi.go.id",
  },
  SG: { name: "Singapore Immigration & Checkpoints Authority", url: "https://www.ica.gov.sg" },
  IN: { name: "Government of India: e-Visa", url: "https://indianvisaonline.gov.in" },
  VN: { name: "Viet Nam Immigration Department: e-Visa", url: "https://evisa.gov.vn" },
  KR: { name: "Korea Visa Portal", url: "https://www.visa.go.kr" },
  GE: { name: "Georgia e-Visa Portal", url: "https://www.evisa.gov.ge" },
  KE: { name: "Kenya Electronic Travel Authorisation", url: "https://www.etakenya.go.ke" },
};

export function officialVisaSource(destination: string): OfficialSource | null {
  return OFFICIAL_VISA_SOURCES[destination.toUpperCase()] ?? null;
}

export const VISA_DISCLAIMER =
  "Visa rules change often and depend on your circumstances. Verify the requirements with the official source or the destination's embassy before you book or travel.";
