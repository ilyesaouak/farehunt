import type { DestinationAirport, OriginAirport } from "./types";

/**
 * Home base for all ground-transport estimates. The fares and times below are
 * realistic advance-purchase estimates from Heidelberg Hbf, not live prices —
 * use the Deutsche Bahn / Rome2Rio links for exact fares.
 */
export const HOME = {
  city: "Heidelberg",
  station: "Heidelberg Hbf",
  lat: 49.4037,
  lon: 8.6757,
} as const;

/** Buffer between arriving at the airport and departure. */
export const AIRPORT_BUFFER_MINUTES = 120;

export const ORIGINS: OriginAirport[] = [
  {
    code: "FRA",
    city: "Frankfurt",
    name: "Frankfurt Airport",
    country: "Germany",
    countryCode: "DE",
    lat: 50.0333,
    lon: 8.5706,
    ground: { mode: "train", minutes: 55, costEur: 17, transfers: 0, station: "Frankfurt(M) Flughafen Fernbf", crossBorder: false },
  },
  {
    code: "STR",
    city: "Stuttgart",
    name: "Stuttgart Airport",
    country: "Germany",
    countryCode: "DE",
    lat: 48.6899,
    lon: 9.222,
    ground: { mode: "train", minutes: 85, costEur: 19, transfers: 1, station: "Stuttgart Flughafen/Messe", crossBorder: false },
  },
  {
    code: "FKB",
    city: "Karlsruhe/Baden-Baden",
    name: "Karlsruhe/Baden-Baden Airport",
    country: "Germany",
    countryCode: "DE",
    lat: 48.7794,
    lon: 8.0805,
    ground: { mode: "train+bus", minutes: 90, costEur: 15, transfers: 1, station: "Baden-Baden", crossBorder: false },
  },
  {
    code: "CGN",
    city: "Cologne",
    name: "Cologne Bonn Airport",
    country: "Germany",
    countryCode: "DE",
    lat: 50.8659,
    lon: 7.1427,
    ground: { mode: "train", minutes: 105, costEur: 27, transfers: 0, station: "Köln/Bonn Flughafen", crossBorder: false },
  },
  {
    code: "DUS",
    city: "Düsseldorf",
    name: "Düsseldorf Airport",
    country: "Germany",
    countryCode: "DE",
    lat: 51.2895,
    lon: 6.7668,
    ground: { mode: "train", minutes: 140, costEur: 30, transfers: 1, station: "Düsseldorf Flughafen", crossBorder: false },
  },
  {
    code: "MUC",
    city: "Munich",
    name: "Munich Airport",
    country: "Germany",
    countryCode: "DE",
    lat: 48.3538,
    lon: 11.7861,
    ground: { mode: "train", minutes: 225, costEur: 35, transfers: 1, station: "München Flughafen Terminal", crossBorder: false },
  },
  {
    code: "BSL",
    city: "Basel/Mulhouse",
    name: "EuroAirport Basel-Mulhouse",
    country: "France/Switzerland",
    countryCode: "FR",
    lat: 47.59,
    lon: 7.5291,
    ground: { mode: "train+bus", minutes: 150, costEur: 29, transfers: 1, station: "Basel SBB", crossBorder: true },
  },
  {
    code: "ORY",
    city: "Paris",
    name: "Paris Orly Airport",
    country: "France",
    countryCode: "FR",
    lat: 48.7233,
    lon: 2.3794,
    ground: { mode: "train", minutes: 270, costEur: 45, transfers: 2, station: "Paris Est", crossBorder: true },
  },
  {
    code: "CDG",
    city: "Paris",
    name: "Paris Charles de Gaulle",
    country: "France",
    countryCode: "FR",
    lat: 49.0097,
    lon: 2.5479,
    ground: { mode: "train", minutes: 255, costEur: 45, transfers: 1, station: "Paris Est", crossBorder: true },
  },
  {
    code: "MRS",
    city: "Marseille",
    name: "Marseille Provence Airport",
    country: "France",
    countryCode: "FR",
    lat: 43.4393,
    lon: 5.2214,
    ground: { mode: "train+bus", minutes: 450, costEur: 65, transfers: 1, station: "Marseille St-Charles", crossBorder: true },
  },
  {
    code: "MXP",
    city: "Milan",
    name: "Milan Malpensa Airport",
    country: "Italy",
    countryCode: "IT",
    lat: 45.63,
    lon: 8.7231,
    ground: { mode: "train", minutes: 390, costEur: 55, transfers: 2, station: "Milano Centrale", crossBorder: true },
  },
  {
    code: "BGY",
    city: "Bergamo",
    name: "Milan Bergamo Airport",
    country: "Italy",
    countryCode: "IT",
    lat: 45.6739,
    lon: 9.7042,
    ground: { mode: "train+bus", minutes: 420, costEur: 55, transfers: 3, station: "Milano Centrale", crossBorder: true },
  },
];

export const DESTINATIONS: DestinationAirport[] = [
  { code: "TUN", city: "Tunis", name: "Tunis-Carthage", lat: 36.851, lon: 10.2272 },
  { code: "NBE", city: "Enfidha", name: "Enfidha-Hammamet", lat: 36.0758, lon: 10.4386 },
  { code: "MIR", city: "Monastir", name: "Monastir Habib Bourguiba", lat: 35.7581, lon: 10.7547 },
  { code: "DJE", city: "Djerba", name: "Djerba-Zarzis", lat: 33.875, lon: 10.7755 },
];

const originIndex = new Map(ORIGINS.map((a) => [a.code, a]));
const destinationIndex = new Map(DESTINATIONS.map((a) => [a.code, a]));

export function getOrigin(code: string): OriginAirport | undefined {
  return originIndex.get(code);
}

export function getDestination(code: string): DestinationAirport | undefined {
  return destinationIndex.get(code);
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
