import { CITY_SAMPLES } from "./cities";
import { COUNTRY_SAMPLES } from "./countries";
import { DEPARTURE_CITIES } from "./departure-cities";
import type { CitySample, CountrySample } from "./types";

export function normalizePlace(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cityNames(c: { city: string; aliases: string[] }) {
  return [c.city, ...c.aliases].map(normalizePlace);
}

export function findCitySample(name: string, country?: string): CitySample | null {
  const n = normalizePlace(name);
  return (
    CITY_SAMPLES.find((c) => (!country || c.country === country) && cityNames(c).includes(n)) ??
    null
  );
}

export function citySamplesIn(country: string): CitySample[] {
  return CITY_SAMPLES.filter((c) => c.country === country);
}

export function findCountrySample(country: string): CountrySample | null {
  return COUNTRY_SAMPLES.find((c) => c.country === country) ?? null;
}

export type GeoPoint = { lat: number; lng: number; airport: string };

/** Coordinates for a city we know, from destination samples or the departure-city table. */
export function findCityPoint(name: string): GeoPoint | null {
  const sample = findCitySample(name);
  if (sample) return { lat: sample.lat, lng: sample.lng, airport: sample.airport };
  const n = normalizePlace(name.split(",")[0] ?? name);
  const dep = DEPARTURE_CITIES.find((d) => [d.city, ...d.aliases].map(normalizePlace).includes(n));
  return dep ? { lat: dep.lat, lng: dep.lng, airport: dep.airport } : null;
}

/** Great-circle distance in km. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
