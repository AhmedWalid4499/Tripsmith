/** Common departure cities with their main airport, for distance-based flight estimates. */
export const DEPARTURE_CITIES: {
  city: string;
  aliases: string[];
  country: string;
  lat: number;
  lng: number;
  airport: string;
}[] = [
  {
    city: "Cairo",
    aliases: ["al qahirah"],
    country: "EG",
    lat: 30.0444,
    lng: 31.2357,
    airport: "CAI",
  },
  {
    city: "Alexandria",
    aliases: ["alex"],
    country: "EG",
    lat: 31.2001,
    lng: 29.9187,
    airport: "HBE",
  },
  { city: "Hurghada", aliases: [], country: "EG", lat: 27.2579, lng: 33.8116, airport: "HRG" },
  { city: "Riyadh", aliases: [], country: "SA", lat: 24.7136, lng: 46.6753, airport: "RUH" },
  { city: "Jeddah", aliases: ["jedda"], country: "SA", lat: 21.4858, lng: 39.1925, airport: "JED" },
  { city: "Doha", aliases: [], country: "QA", lat: 25.2854, lng: 51.531, airport: "DOH" },
  {
    city: "Kuwait City",
    aliases: ["kuwait"],
    country: "KW",
    lat: 29.3759,
    lng: 47.9774,
    airport: "KWI",
  },
  { city: "Amman", aliases: [], country: "JO", lat: 31.9454, lng: 35.9284, airport: "AMM" },
  { city: "Casablanca", aliases: [], country: "MA", lat: 33.5731, lng: -7.5898, airport: "CMN" },
  { city: "Frankfurt", aliases: [], country: "DE", lat: 50.1109, lng: 8.6821, airport: "FRA" },
  { city: "Berlin", aliases: [], country: "DE", lat: 52.52, lng: 13.405, airport: "BER" },
  { city: "Amsterdam", aliases: [], country: "NL", lat: 52.3676, lng: 4.9041, airport: "AMS" },
  { city: "Madrid", aliases: [], country: "ES", lat: 40.4168, lng: -3.7038, airport: "MAD" },
  { city: "Milan", aliases: ["milano"], country: "IT", lat: 45.4642, lng: 9.19, airport: "MXP" },
  { city: "Manchester", aliases: [], country: "GB", lat: 53.4808, lng: -2.2426, airport: "MAN" },
  { city: "Dublin", aliases: [], country: "IE", lat: 53.3498, lng: -6.2603, airport: "DUB" },
  {
    city: "New York",
    aliases: ["new york city", "nyc"],
    country: "US",
    lat: 40.7128,
    lng: -74.006,
    airport: "JFK",
  },
  {
    city: "Los Angeles",
    aliases: ["la"],
    country: "US",
    lat: 34.0522,
    lng: -118.2437,
    airport: "LAX",
  },
  { city: "Chicago", aliases: [], country: "US", lat: 41.8781, lng: -87.6298, airport: "ORD" },
  {
    city: "San Francisco",
    aliases: ["sf"],
    country: "US",
    lat: 37.7749,
    lng: -122.4194,
    airport: "SFO",
  },
  { city: "Toronto", aliases: [], country: "CA", lat: 43.6532, lng: -79.3832, airport: "YYZ" },
  { city: "Mumbai", aliases: ["bombay"], country: "IN", lat: 19.076, lng: 72.8777, airport: "BOM" },
  {
    city: "Delhi",
    aliases: ["new delhi"],
    country: "IN",
    lat: 28.6139,
    lng: 77.209,
    airport: "DEL",
  },
  { city: "Singapore", aliases: [], country: "SG", lat: 1.3521, lng: 103.8198, airport: "SIN" },
  { city: "Sydney", aliases: [], country: "AU", lat: -33.8688, lng: 151.2093, airport: "SYD" },
  {
    city: "Johannesburg",
    aliases: ["joburg"],
    country: "ZA",
    lat: -26.2041,
    lng: 28.0473,
    airport: "JNB",
  },
  { city: "Lagos", aliases: [], country: "NG", lat: 6.5244, lng: 3.3792, airport: "LOS" },
  { city: "Nairobi", aliases: [], country: "KE", lat: -1.2921, lng: 36.8219, airport: "NBO" },
];
