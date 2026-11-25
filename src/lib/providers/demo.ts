import { distanceKm, getDestination, getOrigin } from "../airports";
import { addDays, weekday } from "../dates";
import type { DateQuote, FlightLeg, FlightOffer } from "../types";
import { LIMITS } from "../limits";
import type { FlightProvider, LookupQuery } from "./types";

/**
 * Deterministic, plausible fares used when no SERPAPI_KEY is configured.
 * The same query always yields the same prices, so the UI behaves
 * consistently, and the result is clearly flagged as demo data.
 */

/** Pairs with a nonstop service in the demo world (roughly mirrors real schedules). */
const NONSTOP = new Set([
  "FRA-TUN", "FRA-MIR", "FRA-DJE", "FRA-NBE",
  "STR-TUN", "STR-MIR", "STR-NBE",
  "DUS-TUN", "DUS-MIR", "DUS-DJE", "DUS-NBE",
  "CGN-NBE", "CGN-MIR",
  "MUC-TUN", "MUC-MIR", "MUC-DJE",
  "BSL-TUN", "BSL-DJE",
  "ORY-TUN", "ORY-MIR", "ORY-DJE", "ORY-NBE",
  "CDG-TUN", "CDG-DJE",
  "MRS-TUN", "MRS-MIR", "MRS-DJE",
  "MXP-TUN", "BGY-TUN",
]);

const CARRIERS: Record<string, string[]> = {
  DE: ["Tunisair", "Nouvelair", "Eurowings", "Condor", "Lufthansa"],
  FR: ["Transavia", "Tunisair", "Nouvelair", "Air France"],
  IT: ["Tunisair", "ITA Airways", "Nouvelair"],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function stamp(date: string, minutesFromMidnight: number): string {
  const dayOffset = Math.floor(minutesFromMidnight / 1440);
  const m = ((minutesFromMidnight % 1440) + 1440) % 1440;
  return `${addDays(date, dayOffset)} ${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

function buildOffer(q: LookupQuery, rand: () => number, index: number): FlightOffer {
  const o = getOrigin(q.origin)!;
  const d = getDestination(q.destination)!;
  const km = distanceKm(o, d);
  const key = `${q.origin}-${q.destination}`;
  const nonstop = NONSTOP.has(key) && (index === 0 || rand() > 0.35);
  const carriers = CARRIERS[o.countryCode] ?? CARRIERS.DE;
  const airline = carriers[Math.floor(rand() * carriers.length)];

  // Base one-way fare from distance, then day-of-week demand and noise.
  const dow = weekday(q.date);
  const demand = dow === 5 || dow === 0 ? 1.18 : dow === 2 || dow === 3 ? 0.88 : 1;
  let price = (32 + km * 0.05) * demand * (0.75 + rand() * 0.6);
  if (!nonstop) price *= 1.2 + rand() * 0.25;
  if (q.returnDate) price *= 1.75 + rand() * 0.2;
  price = Math.round(price) - 0.01;

  const departMin = (5 + Math.floor(rand() * 16)) * 60 + [0, 10, 25, 40, 55][Math.floor(rand() * 5)];
  const cruise = Math.round((km / 760) * 60 + 30);
  const legs: FlightLeg[] = [];

  if (nonstop) {
    legs.push({
      from: o.code, to: d.code, airline,
      flightNumber: `${airline.slice(0, 2).toUpperCase()} ${100 + Math.floor(rand() * 899)}`,
      departTime: stamp(q.date, departMin),
      arriveTime: stamp(q.date, departMin + cruise),
      durationMinutes: cruise,
    });
  } else {
    // Connect via Tunis (or via Paris for TUN itself).
    const hub = d.code === "TUN" ? "ORY" : "TUN";
    const first = Math.round(cruise * 0.85);
    const layover = 70 + Math.floor(rand() * 150);
    const second = d.code === "TUN" ? 145 : 55;
    legs.push(
      {
        from: o.code, to: hub, airline,
        flightNumber: `${airline.slice(0, 2).toUpperCase()} ${100 + Math.floor(rand() * 899)}`,
        departTime: stamp(q.date, departMin),
        arriveTime: stamp(q.date, departMin + first),
        durationMinutes: first,
      },
      {
        from: hub, to: d.code, airline: "Tunisair Express",
        flightNumber: `UG ${10 + Math.floor(rand() * 89)}`,
        departTime: stamp(q.date, departMin + first + layover),
        arriveTime: stamp(q.date, departMin + first + layover + second),
        durationMinutes: second,
      },
    );
  }

  const last = legs[legs.length - 1];
  const total = legs.reduce((s, l) => s + l.durationMinutes, 0) + (legs.length > 1 ? diffMinutes(legs[0].arriveTime, legs[1].departTime) : 0);

  return {
    id: `demo-${key}-${q.date}-${index}`,
    price,
    airline: [...new Set(legs.map((l) => l.airline))].join(" + "),
    stops: legs.length - 1,
    durationMinutes: total,
    departTime: legs[0].departTime,
    arriveTime: last.arriveTime,
    legs,
  };
}

function diffMinutes(a: string, b: string): number {
  const toMin = (s: string) => {
    const [date, time] = s.split(" ");
    const [h, m] = time.split(":").map(Number);
    return Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 60000 + h * 60 + m;
  };
  return toMin(b) - toMin(a);
}

export const demoProvider: FlightProvider = {
  source: "demo",
  ...LIMITS.demo,
  async lookup(q, signal) {
    // Simulate network latency so progress streaming is visible.
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, 120 + (hash(q.date + q.origin) % 380));
      signal.addEventListener("abort", () => {
        clearTimeout(t);
        reject(signal.reason);
      }, { once: true });
    });

    const rand = rng(hash(`${q.origin}|${q.destination}|${q.date}|${q.returnDate ?? ""}`));
    const base: DateQuote = { date: q.date, returnDate: q.returnDate, offers: [] };

    // Some route/date combos simply have no service.
    if (!NONSTOP.has(`${q.origin}-${q.destination}`) && rand() < 0.25) return base;

    const count = 2 + Math.floor(rand() * 4);
    const offers = Array.from({ length: count }, (_, i) => buildOffer(q, rand, i)).sort((a, b) => a.price - b.price);
    const low = Math.round(offers[0].price * (0.85 + rand() * 0.25));
    const high = Math.round(low * 1.6);
    const cheapest = offers[0].price;
    const level = cheapest < low ? "low" : cheapest > high ? "high" : "typical";

    return { ...base, offers, insight: { level, typicalRange: [low, high] } };
  },
};
