import { getDestination, getOrigin } from "./airports";
import { addDays, diffDays, isIsoDate, today } from "./dates";
import type { SearchRequest, TripType } from "./types";

export const MAX_FLEX_DAYS = 7;
export const MAX_DAYS_AHEAD = 330;

export type ParseResult = { ok: true; value: SearchRequest } | { ok: false; error: string };

function list(value: string | null): string[] {
  return [...new Set((value ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))];
}

export function parseSearchParams(params: URLSearchParams, now = today()): ParseResult {
  const origins = list(params.get("origins"));
  const destinations = list(params.get("destinations"));
  const tripType: TripType = params.get("tripType") === "return" ? "return" : "oneway";
  const departDate = params.get("depart") ?? "";
  const returnDate = params.get("return") ?? undefined;
  const flexDays = Number(params.get("flex") ?? "1");

  if (origins.length === 0) return { ok: false, error: "Pick at least one departure airport." };
  const badOrigin = origins.find((c) => !getOrigin(c));
  if (badOrigin) return { ok: false, error: `Unknown departure airport "${badOrigin}".` };

  if (destinations.length === 0) return { ok: false, error: "Pick at least one Tunisian airport." };
  const badDest = destinations.find((c) => !getDestination(c));
  if (badDest) return { ok: false, error: `Unknown destination airport "${badDest}".` };

  if (!isIsoDate(departDate)) return { ok: false, error: "Departure date must be a valid YYYY-MM-DD date." };
  if (departDate < now) return { ok: false, error: "Departure date is in the past." };
  if (diffDays(now, departDate) > MAX_DAYS_AHEAD) return { ok: false, error: `Flights can only be searched up to ${MAX_DAYS_AHEAD} days ahead.` };

  if (!Number.isInteger(flexDays) || flexDays < 1 || flexDays > MAX_FLEX_DAYS) {
    return { ok: false, error: `Flexible days must be between 1 and ${MAX_FLEX_DAYS}.` };
  }

  if (tripType === "return") {
    if (!returnDate || !isIsoDate(returnDate)) return { ok: false, error: "Return date must be a valid YYYY-MM-DD date." };
    if (returnDate <= departDate) return { ok: false, error: "Return date must be after the departure date." };
    if (diffDays(now, addDays(returnDate, flexDays - 1)) > MAX_DAYS_AHEAD) {
      return { ok: false, error: `Return date is too far ahead (max ${MAX_DAYS_AHEAD} days).` };
    }
  }

  return {
    ok: true,
    value: {
      origins,
      destinations,
      tripType,
      departDate,
      returnDate: tripType === "return" ? returnDate : undefined,
      flexDays,
    },
  };
}

export function lookupCount(req: Pick<SearchRequest, "origins" | "destinations" | "flexDays">): number {
  return req.origins.length * req.destinations.length * req.flexDays;
}

export function toSearchParams(req: SearchRequest): URLSearchParams {
  const p = new URLSearchParams({
    origins: req.origins.join(","),
    destinations: req.destinations.join(","),
    tripType: req.tripType,
    depart: req.departDate,
    flex: String(req.flexDays),
  });
  if (req.tripType === "return" && req.returnDate) p.set("return", req.returnDate);
  return p;
}
