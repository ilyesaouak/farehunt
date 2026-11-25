import "server-only";
import type { DateQuote, FlightLeg, FlightOffer, PriceInsight, PriceLevel } from "../types";
import { LIMITS } from "../limits";
import type { FlightProvider, LookupQuery } from "./types";

/* Minimal typing of the SerpAPI Google Flights response — only what we read. */
interface SerpAirport {
  id?: string;
  time?: string;
}
interface SerpLeg {
  departure_airport?: SerpAirport;
  arrival_airport?: SerpAirport;
  duration?: number;
  airline?: string;
  airline_logo?: string;
  flight_number?: string;
}
interface SerpItinerary {
  flights?: SerpLeg[];
  total_duration?: number;
  price?: number;
  airline_logo?: string;
  booking_token?: string;
  departure_token?: string;
}
interface SerpResponse {
  error?: string;
  search_metadata?: { google_flights_url?: string };
  best_flights?: SerpItinerary[];
  other_flights?: SerpItinerary[];
  price_insights?: {
    price_level?: string;
    typical_price_range?: [number, number];
  };
}

const ENDPOINT = "https://serpapi.com/search.json";
const TIMEOUT_MS = 25_000;

function toOffer(it: SerpItinerary, index: number, q: LookupQuery): FlightOffer | null {
  const legsRaw = it.flights ?? [];
  const price = Number(it.price);
  if (!Number.isFinite(price) || price <= 0 || legsRaw.length === 0) return null;

  const legs: FlightLeg[] = legsRaw.map((l) => ({
    from: l.departure_airport?.id ?? "",
    to: l.arrival_airport?.id ?? "",
    departTime: l.departure_airport?.time ?? "",
    arriveTime: l.arrival_airport?.time ?? "",
    airline: l.airline ?? "Unknown airline",
    flightNumber: l.flight_number ?? "",
    durationMinutes: l.duration ?? 0,
  }));

  const airlines = [...new Set(legs.map((l) => l.airline))];
  const first = legs[0];
  const last = legs[legs.length - 1];
  const legMinutes = legs.reduce((s, l) => s + l.durationMinutes, 0);

  return {
    id: it.booking_token ?? it.departure_token ?? `${q.origin}-${q.destination}-${q.date}-${index}`,
    price,
    airline: airlines.join(" + "),
    airlineLogo: it.airline_logo ?? legsRaw[0]?.airline_logo,
    stops: legs.length - 1,
    durationMinutes: it.total_duration ?? legMinutes,
    departTime: first.departTime,
    arriveTime: last.arriveTime,
    legs,
  };
}

function toInsight(raw: SerpResponse["price_insights"]): PriceInsight | undefined {
  if (!raw) return undefined;
  const level = ["low", "typical", "high"].includes(raw.price_level ?? "") ? (raw.price_level as PriceLevel) : undefined;
  return { level, typicalRange: raw.typical_price_range };
}

/** SerpAPI reports "no flights" as an error string; that is an empty result, not a failure. */
const NO_RESULTS = /hasn't returned any results|no results/i;

export function createSerpApiProvider(apiKey: string): FlightProvider {
  return {
    source: "live",
    ...LIMITS.live,
    async lookup(q, signal) {
      const params = new URLSearchParams({
        engine: "google_flights",
        api_key: apiKey,
        departure_id: q.origin,
        arrival_id: q.destination,
        outbound_date: q.date,
        type: q.returnDate ? "1" : "2",
        currency: "EUR",
        hl: "en",
        gl: "de",
        adults: "1",
        sort_by: "2", // price
        // No show_hidden: hidden fares don't appear on Google Flights by default,
        // so including them made our prices lower than what users could book.
      });
      if (q.returnDate) params.set("return_date", q.returnDate);

      const base: DateQuote = { date: q.date, returnDate: q.returnDate, offers: [] };

      const res = await fetch(`${ENDPOINT}?${params}`, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
        cache: "no-store",
      });

      let data: SerpResponse;
      try {
        data = (await res.json()) as SerpResponse;
      } catch {
        return { ...base, error: `Provider returned HTTP ${res.status}` };
      }

      if (data.error) {
        return NO_RESULTS.test(data.error) ? base : { ...base, error: data.error };
      }
      if (!res.ok) return { ...base, error: `Provider returned HTTP ${res.status}` };

      const offers = [...(data.best_flights ?? []), ...(data.other_flights ?? [])]
        .map((it, i) => toOffer(it, i, q))
        .filter((o): o is FlightOffer => o !== null)
        .sort((a, b) => a.price - b.price || a.durationMinutes - b.durationMinutes);

      // Same itinerary can appear in both lists — dedupe on price + times + airline.
      const seen = new Set<string>();
      const unique = offers.filter((o) => {
        const key = `${o.price}|${o.departTime}|${o.arriveTime}|${o.airline}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return {
        ...base,
        offers: unique.slice(0, 8),
        insight: toInsight(data.price_insights),
        googleFlightsUrl: data.search_metadata?.google_flights_url,
      };
    },
  };
}
