import "server-only";
import { getOrigin } from "./airports";
import { createLimiter, PromiseCache } from "./cache";
import { addDays, dateRange } from "./dates";
import { buildLinks, bahnUrl } from "./links";
import { assessRisk, computeCosts, doorToDoorMinutes, leaveHomeBy } from "./pricing";
import type { FlightProvider, LookupQuery } from "./providers/types";
import type { DateQuote, RouteResult, SearchEvent, SearchRequest } from "./types";

// Fares move quickly, so keep cached lookups short-lived.
const cache = new PromiseCache<DateQuote>(10 * 60 * 1000);

function lookupsFor(req: SearchRequest, origin: string, destination: string): LookupQuery[] {
  // With flexible dates on a return trip, shift the return by the same offset so
  // every candidate keeps the trip length the user asked for.
  return dateRange(req.departDate, req.flexDays).map((date, i) => ({
    origin,
    destination,
    date,
    returnDate: req.tripType === "return" && req.returnDate ? addDays(req.returnDate, i) : undefined,
  }));
}

export function buildRouteResult(req: SearchRequest, origin: string, destination: string, quotes: DateQuote[]): RouteResult {
  const o = getOrigin(origin)!;
  const sorted = [...quotes].sort((a, b) => a.date.localeCompare(b.date));

  let best: RouteResult["best"] = null;
  let bestQuote: DateQuote | null = null;
  for (const q of sorted) {
    const offer = q.offers[0];
    if (offer && (!best || offer.price < best.offer.price)) {
      best = { date: q.date, returnDate: q.returnDate, offer, insight: q.insight };
      bestQuote = q;
    }
  }

  const linkDate = best?.date ?? req.departDate;
  const links = buildLinks(o, destination, req.tripType, linkDate, best?.returnDate ?? req.returnDate);
  // Prefer the exact Google Flights search SerpAPI ran, so the page shows the same fares.
  if (bestQuote?.googleFlightsUrl) links.googleFlights = bestQuote.googleFlightsUrl;
  if (best) {
    const leave = leaveHomeBy(best.offer, o);
    if (leave) links.bahn = bahnUrl(o.ground.station, best.date, leave);
  }

  return {
    id: `${origin}-${destination}`,
    origin,
    destination,
    tripType: req.tripType,
    quotes: sorted,
    best,
    costs: best ? computeCosts(best.offer, o, req.tripType) : null,
    doorToDoorMinutes: best ? doorToDoorMinutes(best.offer, o) : null,
    risk: best ? assessRisk(best.offer, o) : null,
    links,
  };
}

/**
 * Runs every lookup for the request (bounded concurrency, cached) and emits
 * events as they complete, so the client can render routes progressively.
 */
export async function runSearch(
  req: SearchRequest,
  provider: FlightProvider,
  emit: (e: SearchEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const started = Date.now();
  const limit = createLimiter(provider.concurrency);
  const pairs = req.origins.flatMap((o) => req.destinations.map((d) => [o, d] as const));
  const total = pairs.length * req.flexDays;
  let done = 0;
  let failed = 0;

  emit({ type: "start", source: provider.source, total, routes: pairs.length });

  await Promise.all(
    pairs.map(async ([origin, destination]) => {
      const quotes = await Promise.all(
        lookupsFor(req, origin, destination).map((q) =>
          limit(async () => {
            if (signal.aborted) throw signal.reason;
            const key = `${provider.source}|${q.origin}|${q.destination}|${q.date}|${q.returnDate ?? ""}`;
            let quote: DateQuote;
            try {
              quote = await cache.get(key, () => provider.lookup(q, signal), (v) => !v.error);
            } catch (err) {
              if (signal.aborted) throw err;
              quote = { date: q.date, returnDate: q.returnDate, offers: [], error: err instanceof Error ? err.message : "Lookup failed" };
            }
            if (quote.error) failed++;
            done++;
            emit({ type: "progress", done, total });
            return quote;
          }),
        ),
      );
      emit({ type: "route", result: buildRouteResult(req, origin, destination, quotes) });
    }),
  );

  emit({ type: "done", elapsedMs: Date.now() - started, failed });
}
