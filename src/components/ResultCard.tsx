"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { AIRPORT_BUFFER_MINUTES, getDestination, getOrigin, HOME } from "@/lib/airports";
import { formatDate, formatMinutes, timeOf } from "@/lib/dates";
import { leaveHomeBy } from "@/lib/pricing";
import { verdictFor, type ScoredRoute } from "@/lib/scoring";
import { AnimatedNumber, formatEuro } from "./ui/AnimatedNumber";
import { ArrowIcon, BusIcon, ChevronIcon, ClockIcon, ExternalIcon, HomeIcon, PlaneIcon, ShieldIcon, TrainIcon } from "./ui/icons";
import { ScoreRing } from "./ui/ScoreRing";
import { PriceCalendar } from "./PriceCalendar";

const RISK_STYLE = {
  low: "text-ok bg-ok/10 border-ok/25",
  medium: "text-warn bg-warn/10 border-warn/25",
  high: "text-bad bg-bad/10 border-bad/25",
} as const;

const VERDICT_STYLE = {
  great: "text-lagoon-300 bg-lagoon-400/10 border-lagoon-400/30",
  good: "text-lagoon-300 bg-lagoon-400/5 border-lagoon-400/20",
  neutral: "text-ink-300 bg-white/5 border-white/10",
  poor: "text-coral-400 bg-coral-500/10 border-coral-500/25",
} as const;

export function ResultCard({
  route,
  rank,
  isTop,
  savingVsNearest,
  onHover,
}: {
  route: ScoredRoute;
  rank: number;
  isTop: boolean;
  savingVsNearest: number | null;
  onHover: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(isTop);
  const o = getOrigin(route.origin)!;
  const d = getDestination(route.destination)!;
  const { offer } = route.best;
  const verdict = verdictFor(route);
  const leave = leaveHomeBy(offer, o);
  const GroundMode = o.ground.mode === "bus" ? BusIcon : TrainIcon;
  const flightPct = (route.costs.flight / route.costs.total) * 100;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      onMouseEnter={() => onHover(route.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(route.id)}
      className={`group relative overflow-hidden rounded-3xl border transition-colors ${
        isTop ? "border-sand-300/40 bg-gradient-to-br from-sand-300/[0.07] via-ink-900/80 to-ink-900/80" : "border-white/8 bg-ink-900/60 hover:border-white/15"
      }`}
    >
      {isTop && <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-coral-500/15 blur-3xl" />}

      <div className="relative p-5 sm:p-6">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <ScoreRing score={route.score} />
            <span className="text-[10px] font-semibold text-ink-500">#{rank}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {isTop && <Tag className="border-sand-300/40 bg-sand-300/15 text-sand-200">★ Best value</Tag>}
              {route.isCheapest && <Tag className="border-lagoon-400/30 bg-lagoon-400/10 text-lagoon-300">Cheapest</Tag>}
              {route.isFastest && <Tag className="border-white/15 bg-white/5 text-ink-200">Fastest</Tag>}
              <Tag className={VERDICT_STYLE[verdict.tone]}>{verdict.label}</Tag>
            </div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="flex flex-wrap items-center gap-x-2 text-lg font-extrabold tracking-tight sm:text-xl">
                  <span>{o.city}</span>
                  <ArrowIcon className="text-ink-500" />
                  <span>{d.city}</span>
                </h3>
                <p className="mt-0.5 text-sm text-ink-400">
                  {formatDate(route.best.date)}
                  {route.best.returnDate && <> → {formatDate(route.best.returnDate)}</>} · {offer.airline}
                </p>
              </div>

              <div className="sm:text-right">
                <AnimatedNumber value={route.costs.total} className="text-3xl font-black tracking-tight text-sand-200" />
                <p className="text-xs text-ink-400">
                  total {route.tripType === "return" ? "round trip" : "one way"}
                </p>
                {savingVsNearest !== null && savingVsNearest > 1 && (
                  <p className="mt-0.5 text-xs font-semibold text-lagoon-300">saves {formatEuro(savingVsNearest)} vs nearest airport</p>
                )}
              </div>
            </div>

            {/* Journey timeline */}
            <div className="mt-4 flex items-center gap-2 text-xs">
              <Stop icon={<HomeIcon width={13} height={13} />} label={HOME.city} sub={leave ? `leave ${leave}` : "night before"} />
              <Segment tone="ground" label={formatMinutes(o.ground.minutes)} icon={<GroundMode width={12} height={12} />} />
              <Stop label={o.code} sub={timeOf(offer.departTime)} mono />
              <Segment tone="flight" label={`${formatMinutes(offer.durationMinutes)} · ${offer.stops === 0 ? "nonstop" : `${offer.stops} stop`}`} icon={<PlaneIcon width={12} height={12} />} />
              <Stop label={d.code} sub={timeOf(offer.arriveTime)} mono accent />
            </div>

            {/* Cost breakdown */}
            <div className="mt-4">
              <div className="flex h-2 overflow-hidden rounded-full bg-ink-800">
                <motion.div className="h-full bg-gradient-to-r from-sand-300 to-coral-400" initial={{ width: 0 }} animate={{ width: `${flightPct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
                <motion.div className="h-full bg-lagoon-400" initial={{ width: 0 }} animate={{ width: `${100 - flightPct}%` }} transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} />
              </div>
              <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-[11px] text-ink-400">
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-coral-400" />
                  Flight {formatEuro(route.costs.flight, true)}
                </span>
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-lagoon-400" />
                  Ground ~{formatEuro(route.costs.ground)}
                  {route.costs.groundLegs > 1 && <> ({formatEuro(o.ground.costEur)} × {route.costs.groundLegs})</>}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon width={12} height={12} /> {formatMinutes(route.doorToDoorMinutes)} door to door
                </span>
                <span className={`flex items-center gap-1 rounded-full border px-2 ${RISK_STYLE[route.risk.level]}`}>
                  <ShieldIcon width={11} height={11} /> {route.risk.level} risk
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <motion.a
                href={route.links.googleFlights}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-4 py-2 text-xs font-bold text-ink-950 transition hover:bg-white"
              >
                Book flight <ExternalIcon width={13} height={13} />
              </motion.a>
              <a
                href={route.links.bahn}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-ink-200 transition hover:border-lagoon-400/50 hover:text-lagoon-300"
              >
                <TrainIcon width={13} height={13} /> Train to {o.code}
              </a>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-ink-300 transition hover:bg-white/5 hover:text-ink-100"
              >
                {open ? "Hide details" : "Details"}
                <motion.span animate={{ rotate: open ? 180 : 0 }}>
                  <ChevronIcon width={14} height={14} />
                </motion.span>
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-6 grid gap-6 border-t border-white/8 pt-6 lg:grid-cols-2">
                {route.quotes.length > 1 ? (
                  <PriceCalendar quotes={route.quotes} bestDate={route.best.date} groundCost={route.costs.ground} />
                ) : (
                  <Itinerary route={route} />
                )}

                <div className="space-y-5">
                  {route.quotes.length > 1 && <Itinerary route={route} />}

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Getting to {o.code}</p>
                    <p className="text-sm text-ink-200">
                      {HOME.station} → {o.ground.station}: about {formatMinutes(o.ground.minutes)} by {o.ground.mode.replace("+", " + ")}
                      {o.ground.transfers > 0 ? `, ${o.ground.transfers} change${o.ground.transfers > 1 ? "s" : ""}` : ", direct"}. Typical
                      advance fare ~{formatEuro(o.ground.costEur)} each way. Plan to arrive {AIRPORT_BUFFER_MINUTES / 60}h before departure.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <LinkChip href={route.links.bahn}>Deutsche Bahn</LinkChip>
                      <LinkChip href={route.links.rome2rio}>Compare bus & train</LinkChip>
                      <LinkChip href={route.links.skyscanner}>Skyscanner</LinkChip>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Risk factors</p>
                    <ul className="space-y-1 text-sm text-ink-300">
                      {route.risk.reasons.map((r) => (
                        <li key={r} className="flex gap-2">
                          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${route.risk.level === "low" ? "bg-ok" : route.risk.level === "medium" ? "bg-warn" : "bg-bad"}`} />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

function Itinerary({ route }: { route: ScoredRoute }) {
  const best = route.best;
  const quote = route.quotes.find((q) => q.date === best.date);
  const others = (quote?.offers ?? []).filter((o) => o.id !== best.offer.id).slice(0, 3);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Flight</p>
      <ol className="space-y-2">
        {best.offer.legs.map((l, i) => (
          <li key={`${l.flightNumber}-${i}`} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
            <PlaneIcon width={14} height={14} className="text-sand-300" />
            <span className="font-mono font-semibold">{l.from}</span>
            <span className="text-ink-500">{timeOf(l.departTime)}</span>
            <ArrowIcon width={12} height={12} className="text-ink-500" />
            <span className="font-mono font-semibold">{l.to}</span>
            <span className="text-ink-500">{timeOf(l.arriveTime)}</span>
            <span className="ml-auto truncate text-xs text-ink-400">
              {l.airline} {l.flightNumber}
            </span>
          </li>
        ))}
      </ol>
      {others.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Other flights that day</p>
          <ul className="space-y-1.5 text-sm">
            {others.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 text-ink-300">
                <span className="truncate">
                  {timeOf(f.departTime)}–{timeOf(f.arriveTime)} · {f.airline} · {f.stops === 0 ? "nonstop" : `${f.stops} stop`}
                </span>
                <span className="tabular font-semibold text-ink-100">{formatEuro(f.price + route.costs.ground)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Tag({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className}`}>{children}</span>;
}

function Stop({ label, sub, icon, mono, accent }: { label: string; sub: string; icon?: React.ReactNode; mono?: boolean; accent?: boolean }) {
  return (
    <div className="shrink-0 text-center">
      <div className={`flex items-center justify-center gap-1 font-bold ${mono ? "font-mono" : ""} ${accent ? "text-coral-400" : "text-ink-100"}`}>
        {icon}
        <span className="max-w-20 truncate">{label}</span>
      </div>
      <div className="tabular text-[10px] text-ink-500">{sub}</div>
    </div>
  );
}

function Segment({ label, icon, tone }: { label: string; icon: React.ReactNode; tone: "ground" | "flight" }) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col items-center">
      <span className={`mb-1 flex items-center gap-1 truncate text-[10px] ${tone === "flight" ? "text-sand-300" : "text-lagoon-300"}`}>
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <div className={`h-px w-full ${tone === "flight" ? "bg-gradient-to-r from-sand-300/60 to-coral-400/60" : "border-t border-dashed border-lagoon-400/50"}`} />
    </div>
  );
}

function LinkChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-ink-300 transition hover:border-lagoon-400/40 hover:text-lagoon-300"
    >
      {children} <ExternalIcon width={11} height={11} />
    </a>
  );
}
