import { AIRPORT_BUFFER_MINUTES } from "./airports";
import { timeOf } from "./dates";
import type { CostBreakdown, FlightOffer, OriginAirport, RiskAssessment, RiskLevel, TripType } from "./types";

/** Leaving home earlier than this is treated as impractical. */
const EARLIEST_LEAVE = "05:00";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Total trip cost. Ground transport is paid on every leg: once for one-way,
 * twice for a return trip (out to the airport and back home again).
 */
export function computeCosts(offer: FlightOffer, origin: OriginAirport, tripType: TripType): CostBreakdown {
  const groundLegs = tripType === "return" ? 2 : 1;
  const ground = origin.ground.costEur * groundLegs;
  return {
    flight: round2(offer.price),
    ground: round2(ground),
    groundLegs,
    total: round2(offer.price + ground),
  };
}

/** Home → destination arrival, outbound: ground + airport buffer + flight. */
export function doorToDoorMinutes(offer: FlightOffer, origin: OriginAirport): number {
  return origin.ground.minutes + AIRPORT_BUFFER_MINUTES + offer.durationMinutes;
}

/** When to leave home to reach the airport with the buffer to spare ("HH:mm", clamped to the same day). */
export function leaveHomeBy(offer: FlightOffer, origin: OriginAirport): string | null {
  const t = timeOf(offer.departTime);
  if (!/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  const minutes = h * 60 + m - AIRPORT_BUFFER_MINUTES - origin.ground.minutes;
  if (minutes < 0) return null; // would need to travel the night before
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Risk of the whole itinerary going wrong (missed flight, missed connection),
 * derived from the actual offer instead of a hard-coded label per airport.
 */
export function assessRisk(offer: FlightOffer, origin: OriginAirport): RiskAssessment {
  const reasons: string[] = [];
  let points = 0;
  const g = origin.ground;

  if (g.minutes >= 360) {
    points += 2;
    reasons.push(`Long ${Math.round(g.minutes / 60)}h ground journey before the flight`);
  } else if (g.minutes >= 180) {
    points += 1;
    reasons.push(`${Math.round(g.minutes / 60)}h ground journey to the airport`);
  }

  if (g.transfers >= 2) {
    points += 1;
    reasons.push(`${g.transfers} changes on the way to the airport`);
  }

  if (g.crossBorder) {
    reasons.push("Cross-border rail — strikes or delays are harder to recover from");
    points += g.minutes >= 180 ? 1 : 0;
  }

  if (offer.stops >= 2) {
    points += 2;
    reasons.push(`${offer.stops} stops`);
  } else if (offer.stops === 1) {
    points += 1;
    reasons.push("1 stop");
  }

  const leave = leaveHomeBy(offer, origin);
  if (leave === null || leave < EARLIEST_LEAVE) {
    points += 1;
    reasons.push(
      leave === null
        ? "Departure too early to reach by ground the same day — needs a night near the airport"
        : `You'd have to leave home at ${leave} — consider a night near the airport`,
    );
  }

  const level: RiskLevel = points >= 4 ? "high" : points >= 2 ? "medium" : "low";
  if (reasons.length === 0) reasons.push("Short, direct ground connection and a nonstop flight");
  return { level, reasons };
}

export const RISK_ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
