import type { RiskLevel, RouteResult } from "./types";

export type SortKey = "best" | "cheapest" | "fastest";

export type PricedRoute = RouteResult & {
  best: NonNullable<RouteResult["best"]>;
  costs: NonNullable<RouteResult["costs"]>;
  doorToDoorMinutes: number;
  risk: NonNullable<RouteResult["risk"]>;
};

export interface ScoredRoute extends PricedRoute {
  /** 0–100, relative to the other routes in the same result set. */
  score: number;
  isCheapest: boolean;
  isFastest: boolean;
}

const RISK_FACTOR: Record<RiskLevel, number> = { low: 1, medium: 0.7, high: 0.4 };

/** Weights for the "best value" score. Price matters most, but not at any cost. */
export const WEIGHTS = { price: 0.6, time: 0.25, risk: 0.15 } as const;

export function isPriced(r: RouteResult): r is PricedRoute {
  return r.best !== null && r.costs !== null && r.doorToDoorMinutes !== null && r.risk !== null;
}

/**
 * Scores each route against the best in the set. A route that is both the
 * cheapest and the fastest with low risk gets 100. Unlike the old absolute
 * formula (100 − price × 0.4), this never collapses to 0 for normal fares.
 */
export function scoreRoutes(routes: PricedRoute[]): ScoredRoute[] {
  if (routes.length === 0) return [];
  const minPrice = Math.min(...routes.map((r) => r.costs.total));
  const minTime = Math.min(...routes.map((r) => r.doorToDoorMinutes));

  return routes.map((r) => {
    const price = minPrice / r.costs.total;
    const time = minTime / r.doorToDoorMinutes;
    const risk = RISK_FACTOR[r.risk.level];
    const score = Math.round(100 * (WEIGHTS.price * price + WEIGHTS.time * time + WEIGHTS.risk * risk));
    return {
      ...r,
      score,
      isCheapest: r.costs.total === minPrice,
      isFastest: r.doorToDoorMinutes === minTime,
    };
  });
}

export function sortRoutes(routes: ScoredRoute[], key: SortKey): ScoredRoute[] {
  const copy = [...routes];
  const byPrice = (a: ScoredRoute, b: ScoredRoute) => a.costs.total - b.costs.total;
  const byTime = (a: ScoredRoute, b: ScoredRoute) => a.doorToDoorMinutes - b.doorToDoorMinutes;
  switch (key) {
    case "cheapest":
      return copy.sort((a, b) => byPrice(a, b) || byTime(a, b));
    case "fastest":
      return copy.sort((a, b) => byTime(a, b) || byPrice(a, b));
    default:
      return copy.sort((a, b) => b.score - a.score || byPrice(a, b));
  }
}

export function verdictFor(r: PricedRoute): { label: string; tone: "great" | "good" | "neutral" | "poor" } {
  const level = r.best.insight?.level;
  const range = r.best.insight?.typicalRange;
  if (level === "low") return { label: "Below typical price", tone: "great" };
  if (level === "high") return { label: "Above typical price", tone: "poor" };
  if (level === "typical" && range) {
    const mid = (range[0] + range[1]) / 2;
    return r.best.offer.price <= mid
      ? { label: "Good price", tone: "good" }
      : { label: "Typical price", tone: "neutral" };
  }
  return { label: "Typical price", tone: "neutral" };
}
