import { HOME } from "./airports";
import { compactDate } from "./dates";
import type { OriginAirport, RouteLinks, TripType } from "./types";

export function googleFlightsUrl(from: string, to: string, date: string, returnDate?: string): string {
  const q = returnDate
    ? `Flights from ${from} to ${to} on ${date} returning ${returnDate}`
    : `Flights from ${from} to ${to} on ${date} one way`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&curr=EUR&hl=en`;
}

export function skyscannerUrl(from: string, to: string, date: string, returnDate?: string): string {
  const path = [from.toLowerCase(), to.toLowerCase(), compactDate(date), returnDate ? compactDate(returnDate) : null]
    .filter(Boolean)
    .join("/");
  return `https://www.skyscanner.net/transport/flights/${path}/?adultsv2=1&currency=EUR&rtn=${returnDate ? 1 : 0}`;
}

/** Deutsche Bahn journey planner, pre-filled with home station → airport station. */
export function bahnUrl(station: string, date: string, departTime = "06:00"): string {
  const params: Record<string, string> = {
    sts: "true",
    so: HOME.station,
    zo: station,
    kl: "2",
    hd: `${date}T${departTime}:00`,
    hza: "D",
  };
  // DB parses the fragment itself and expects %20 (not "+") for spaces.
  const hash = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `https://int.bahn.de/en/buchung/fahrplan/suche#${hash}`;
}

/** Rome2Rio compares every mode (train, bus, car share) between two places. */
export function rome2rioUrl(origin: OriginAirport): string {
  const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-");
  return `https://www.rome2rio.com/map/${slug(HOME.city)}/${slug(origin.name)}-${origin.code}`;
}

export function buildLinks(origin: OriginAirport, destination: string, tripType: TripType, date: string, returnDate?: string): RouteLinks {
  const ret = tripType === "return" ? returnDate : undefined;
  return {
    googleFlights: googleFlightsUrl(origin.code, destination, date, ret),
    skyscanner: skyscannerUrl(origin.code, destination, date, ret),
    bahn: bahnUrl(origin.ground.station, date),
    rome2rio: rome2rioUrl(origin),
  };
}
