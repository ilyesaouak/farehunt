"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { getDestination, getOrigin } from "@/lib/airports";
import { RISK_ORDER } from "@/lib/pricing";
import { isPriced, scoreRoutes, sortRoutes, WEIGHTS, type ScoredRoute, type SortKey } from "@/lib/scoring";
import type { RiskLevel, RouteResult } from "@/lib/types";
import type { SearchState } from "@/hooks/useFlightSearch";
import { ResultCard } from "./ResultCard";
import { formatEuro } from "./ui/AnimatedNumber";
import { AlertIcon } from "./ui/icons";
import { Segmented } from "./ui/Segmented";

type RiskFilter = "any" | "medium" | "low";

export function Results({ state, onHover }: { state: SearchState; onHover: (id: string | null) => void }) {
  const [sort, setSort] = useState<SortKey>("best");
  const [risk, setRisk] = useState<RiskFilter>("any");
  const [nonstop, setNonstop] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const { scored, empty, priceBounds } = useMemo(() => {
    const priced = state.routes.filter(isPriced);
    const empty = state.routes.filter((r) => !isPriced(r));
    const scored = scoreRoutes(priced);
    const totals = scored.map((r) => r.costs.total);
    const priceBounds = totals.length ? ([Math.floor(Math.min(...totals)), Math.ceil(Math.max(...totals))] as const) : null;
    return { scored, empty, priceBounds };
  }, [state.routes]);

  const visible = useMemo(() => {
    const filtered = scored.filter(
      (r) =>
        (risk === "any" || RISK_ORDER[r.risk.level] <= RISK_ORDER[risk as RiskLevel]) &&
        (!nonstop || r.best.offer.stops === 0) &&
        (maxPrice === null || r.costs.total <= maxPrice),
    );
    return sortRoutes(filtered, sort);
  }, [scored, risk, nonstop, maxPrice, sort]);

  // Savings are measured against the airport with the shortest ground trip.
  const nearest = useMemo(
    () => scored.reduce<ScoredRoute | null>((n, r) => (!n || getOrigin(r.origin)!.ground.minutes < getOrigin(n.origin)!.ground.minutes ? r : n), null),
    [scored],
  );

  const loading = state.status === "loading";
  const pending = Math.max(0, state.expectedRoutes - state.routes.length);
  const topId = sortRoutes(scored, "best")[0]?.id;

  if (state.status === "error") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 rounded-3xl border border-bad/30 bg-bad/10 p-5 text-sm">
        <AlertIcon className="mt-0.5 shrink-0 text-bad" />
        <div>
          <p className="font-bold text-ink-100">Search failed</p>
          <p className="mt-1 text-ink-300">{state.error}</p>
        </div>
      </motion.div>
    );
  }

  const sliderValue = maxPrice ?? priceBounds?.[1] ?? 0;

  return (
    <section aria-label="Results" className="space-y-5">
      {(scored.length > 0 || loading) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass sticky top-3 z-20 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl px-4 py-3"
        >
          <Segmented
            id="sort"
            size="sm"
            ariaLabel="Sort results"
            value={sort}
            onChange={setSort}
            options={[
              { value: "best", label: "Best value" },
              { value: "cheapest", label: "Cheapest" },
              { value: "fastest", label: "Fastest" },
            ]}
          />
          <Segmented
            id="risk"
            size="sm"
            ariaLabel="Maximum risk"
            value={risk}
            onChange={setRisk}
            options={[
              { value: "any", label: "Any risk" },
              { value: "medium", label: "≤ Medium" },
              { value: "low", label: "Low only" },
            ]}
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-300">
            <input type="checkbox" checked={nonstop} onChange={(e) => setNonstop(e.target.checked)} className="h-4 w-4 accent-lagoon-400" />
            Nonstop only
          </label>
          {priceBounds && priceBounds[1] > priceBounds[0] && (
            <label className="flex min-w-48 flex-1 items-center gap-3 text-xs text-ink-300">
              <span className="whitespace-nowrap font-semibold">Max {formatEuro(sliderValue)}</span>
              <input
                type="range"
                min={priceBounds[0]}
                max={priceBounds[1]}
                value={sliderValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMaxPrice(v >= priceBounds[1] ? null : v);
                }}
                className="w-full"
                style={{ "--fill": `${((sliderValue - priceBounds[0]) / (priceBounds[1] - priceBounds[0])) * 100}%` } as React.CSSProperties}
              />
            </label>
          )}
          <span className="ml-auto text-xs text-ink-400">
            <span className="font-bold text-ink-100">{visible.length}</span> of {scored.length} routes
          </span>
        </motion.div>
      )}

      {state.source === "demo" && (scored.length > 0 || loading) && (
        <div className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-ink-200">
          <AlertIcon className="mt-0.5 shrink-0 text-warn" />
          <p>
            <span className="font-bold text-warn">These are simulated demo prices</span> — they won&apos;t match Google Flights or any airline. For real
            fares, set <code className="font-mono text-xs">SERPAPI_KEY</code> in <code className="font-mono text-xs">.env.local</code>, restart the
            server, and turn off &ldquo;Demo data&rdquo;.
          </p>
        </div>
      )}

      <motion.div layout className="space-y-4">
        <AnimatePresence mode="popLayout">
          {visible.map((r, i) => (
            <ResultCard
              key={r.id}
              route={r}
              rank={i + 1}
              isTop={r.id === topId}
              savingVsNearest={nearest && nearest.id !== r.id ? nearest.costs.total - r.costs.total : null}
              simulated={state.source === "demo"}
              onHover={onHover}
            />
          ))}
        </AnimatePresence>

        {loading &&
          Array.from({ length: Math.min(pending, 3) }, (_, i) => <SkeletonCard key={`sk-${i}`} delay={i * 0.12} />)}
      </motion.div>

      {!loading && scored.length > 0 && visible.length === 0 && (
        <p className="rounded-2xl border border-white/8 p-6 text-center text-sm text-ink-400">No routes match these filters. Loosen the risk or price filter.</p>
      )}

      {!loading && state.status !== "idle" && scored.length === 0 && (
        <div className="rounded-3xl border border-white/8 bg-ink-900/50 p-8 text-center">
          <p className="text-lg font-bold">{state.status === "cancelled" ? "Scan cancelled" : "No flights found"}</p>
          <p className="mt-1 text-sm text-ink-400">
            {state.status === "cancelled" ? "Start a new search whenever you're ready." : "Try more departure airports, another date, or more flexible days."}
          </p>
        </div>
      )}

      {empty.length > 0 && !loading && <NoFlights routes={empty} />}

      {scored.length > 1 && !loading && (
        <p className="text-center text-[11px] text-ink-500">
          Value score = {WEIGHTS.price * 100}% price + {WEIGHTS.time * 100}% door-to-door time + {WEIGHTS.risk * 100}% reliability, relative to the best route in
          this search. Ground fares are estimates.
          {state.failed > 0 && <> {state.failed} lookups failed and were skipped.</>}
        </p>
      )}
    </section>
  );
}

function NoFlights({ routes }: { routes: RouteResult[] }) {
  return (
    <details className="group rounded-2xl border border-white/8 bg-ink-900/40 px-4 py-3 text-sm text-ink-400">
      <summary className="cursor-pointer list-none font-semibold text-ink-300">
        {routes.length} route{routes.length > 1 ? "s" : ""} without flights on these dates
        <span className="ml-1 text-ink-500 group-open:hidden">— show</span>
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        {routes.map((r) => (
          <span key={r.id} className="rounded-full border border-white/8 px-2.5 py-1 font-mono text-xs" title={r.quotes.find((q) => q.error)?.error}>
            {r.origin} → {r.destination}
            <span className="ml-1 font-sans text-ink-500">{getDestination(r.destination)?.city}</span>
            {r.quotes.some((q) => q.error) && <span className="ml-1 text-bad">!</span>}
          </span>
        ))}
      </div>
    </details>
  );
}

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay }}
      className="relative overflow-hidden rounded-3xl border border-white/6 bg-ink-900/40 p-6"
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      <div className="flex gap-4">
        <div className="h-14 w-14 rounded-full bg-white/5" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-32 rounded-full bg-white/5" />
          <div className="h-5 w-56 rounded-full bg-white/8" />
          <div className="h-2 w-full rounded-full bg-white/5" />
        </div>
        <div className="h-8 w-20 rounded-lg bg-white/8" />
      </div>
    </motion.div>
  );
}
