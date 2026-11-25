"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { useFlightSearch } from "@/hooks/useFlightSearch";
import { getDestination, getOrigin, HOME } from "@/lib/airports";
import { formatDate, formatMinutes } from "@/lib/dates";
import { isPriced, scoreRoutes, sortRoutes } from "@/lib/scoring";
import type { DataSource } from "@/lib/types";
import { Results } from "./Results";
import { RouteMap } from "./RouteMap";
import { SearchPanel, type SearchForm } from "./SearchPanel";
import { AnimatedNumber, formatEuro } from "./ui/AnimatedNumber";
import { ClockIcon, PlaneIcon, ShieldIcon, SparkIcon, TrainIcon } from "./ui/icons";

const ease = [0.16, 1, 0.3, 1] as const;

export function FareHunt({
  today,
  defaultDepart,
  defaultReturn,
  source,
}: {
  today: string;
  defaultDepart: string;
  defaultReturn: string;
  source: DataSource;
}) {
  const [form, setForm] = useState<SearchForm>({
    tripType: "oneway",
    origins: ["FRA", "STR", "FKB", "CGN", "DUS", "BSL", "ORY", "MRS"],
    destinations: ["TUN", "NBE", "MIR", "DJE"],
    departDate: defaultDepart,
    returnDate: defaultReturn,
    flexDays: 3,
    demo: false,
  });
  const { state, search, cancel } = useFlightSearch({ forceDemo: form.demo });
  const [hovered, setHovered] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const best = useMemo(() => sortRoutes(scoreRoutes(state.routes.filter(isPriced)), "best")[0] ?? null, [state.routes]);
  const highlightId = hovered ?? best?.id ?? null;
  const highlight = highlightId ? { origin: highlightId.split("-")[0], destination: highlightId.split("-")[1] } : null;

  // While results are on screen, the map shows the searched airports, not the edited form.
  const mapOrigins = state.request && state.status !== "idle" ? state.request.origins : form.origins;
  const mapDestinations = state.request && state.status !== "idle" ? state.request.destinations : form.destinations;

  const submit = () => {
    search({
      origins: form.origins,
      destinations: form.destinations,
      tripType: form.tripType,
      departDate: form.departDate,
      returnDate: form.tripType === "return" ? form.returnDate : undefined,
      flexDays: form.flexDays,
    });
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const shownSource = state.source ?? (source === "live" && !form.demo ? "live" : "demo");

  return (
    <MotionConfig reducedMotion="user">
      <Background />

      <div className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-6">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sand-300 to-coral-500 text-ink-950 shadow-lg shadow-coral-500/30">
              <PlaneIcon width={18} height={18} />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Fare<span className="text-gradient">Hunt</span>
            </span>
          </motion.div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
              shownSource === "live" ? "border-ok/30 bg-ok/10 text-ok" : "border-warn/30 bg-warn/10 text-warn"
            }`}
            title={shownSource === "demo" ? "No SERPAPI_KEY configured or demo mode selected — prices are simulated." : "Live Google Flights prices via SerpAPI"}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            {shownSource === "live" ? "Live prices" : "Demo prices"}
          </motion.span>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0 space-y-8">
            <section className="pt-4 sm:pt-10">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }}
                className="inline-flex items-center gap-2 rounded-full border border-lagoon-400/30 bg-lagoon-400/10 px-3 py-1 text-xs font-semibold text-lagoon-300"
              >
                <SparkIcon width={13} height={13} /> {HOME.city} → Tunisia, door to door
              </motion.p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
                {["The", "cheapest", "way", "to", "Tunisia", "isn't", "always", "the"].map((w, i) => (
                  <motion.span
                    key={i}
                    className="mr-[0.25em] inline-block"
                    initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.7, delay: 0.05 * i, ease }}
                  >
                    {w}
                  </motion.span>
                ))}
                <motion.span
                  className="text-gradient inline-block"
                  initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.8, delay: 0.45, ease }}
                >
                  closest airport.
                </motion.span>
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="mt-5 max-w-2xl text-base text-ink-300 sm:text-lg"
              >
                FareHunt scans flights from a dozen airports in Germany, France, Switzerland and Italy, adds the train or bus to get there — both ways — and
                ranks every route by real total cost, travel time and risk.
              </motion.p>
            </section>

            <div className="lg:hidden">
              <MapCard origins={mapOrigins} destinations={mapDestinations} highlight={highlight} compact />
            </div>

            <SearchPanel
              form={form}
              onChange={setForm}
              onSubmit={submit}
              onCancel={cancel}
              loading={state.status === "loading"}
              today={today}
              source={source}
            />

            <div ref={resultsRef} className="scroll-mt-6 space-y-5">
              <AnimatePresence>{state.status === "loading" && <ScanProgress done={state.done} total={state.total} />}</AnimatePresence>
              {state.status === "idle" ? <HowItWorks /> : <Results state={state} onHover={setHovered} />}
            </div>
          </main>

          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-4">
              <MapCard origins={mapOrigins} destinations={mapDestinations} highlight={highlight} />
              <AnimatePresence mode="wait">
                {best && (
                  <motion.div
                    key={best.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease }}
                    className="glass rounded-3xl p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Best value so far</p>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-ink-200">
                          {best.origin} → {best.destination}
                        </p>
                        <p className="text-xs text-ink-400">
                          {getOrigin(best.origin)?.city} → {getDestination(best.destination)?.city} · {formatDate(best.best.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <AnimatedNumber value={best.costs.total} className="text-3xl font-black text-sand-200" />
                        <p className="text-[11px] text-ink-400">incl. train · flight {formatEuro(best.costs.flight, true)}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-ink-400">
                      <Stat icon={<PlaneIcon width={13} height={13} />} label={best.best.offer.stops === 0 ? "Nonstop" : `${best.best.offer.stops} stop`} />
                      <Stat icon={<ClockIcon width={13} height={13} />} label={formatMinutes(best.doorToDoorMinutes)} />
                      <Stat icon={<ShieldIcon width={13} height={13} />} label={`${best.risk.level} risk`} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </aside>
        </div>

        <footer className="mt-20 border-t border-white/8 pt-6 text-xs text-ink-500">
          Flight prices {shownSource === "live" ? "from Google Flights via SerpAPI" : "are simulated (demo mode)"}. Ground transport fares and times are estimates from{" "}
          {HOME.station}; always confirm on Deutsche Bahn before booking.
        </footer>
      </div>
    </MotionConfig>
  );
}

function MapCard({
  origins,
  destinations,
  highlight,
  compact,
}: {
  origins: string[];
  destinations: string[];
  highlight: { origin: string; destination: string } | null;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease }}
      className={`glass relative overflow-hidden rounded-3xl ${compact ? "mx-auto h-72 max-w-sm" : "h-[30rem]"}`}
    >
      <div className="absolute left-4 top-4 z-10 flex items-center gap-3 text-[10px] text-ink-400">
        <span className="flex items-center gap-1">
          <span className="w-4 border-t border-dashed border-lagoon-400" /> ground
        </span>
        <span className="flex items-center gap-1">
          <span className="h-px w-4 bg-sand-300" /> flight
        </span>
      </div>
      <RouteMap origins={origins} destinations={destinations} highlight={highlight} />
    </motion.div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.03] py-2 capitalize">
      <span className="text-ink-300">{icon}</span>
      {label}
    </div>
  );
}

function ScanProgress({ done, total }: { done: number; total: number }) {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="glass rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between text-sm">
          <p className="flex items-center gap-2 font-semibold text-ink-100">
            <motion.span animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-sand-300">
              <PlaneIcon />
            </motion.span>
            Scanning fares…
          </p>
          <p className="tabular text-xs text-ink-400">
            {done} / {total || "…"} lookups
          </p>
        </div>
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-ink-800">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-lagoon-400 via-sand-300 to-coral-400"
            animate={{ width: `${Math.max(pct, 3)}%` }}
            transition={{ ease: "easeOut" }}
          />
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>
      </div>
    </motion.div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: <TrainIcon width={20} height={20} />, title: "Ground leg included", text: `Train or bus from ${HOME.city} to each airport — counted on the way back too for return trips.` },
    { icon: <PlaneIcon width={20} height={20} />, title: "Every airport, every day", text: "Up to 12 airports × 4 Tunisian destinations × 7 flexible days, scanned in parallel and streamed live." },
    { icon: <ShieldIcon width={20} height={20} />, title: "Ranked by real value", text: "Total cost, door-to-door time and the risk of long transfers or connections, weighed together." },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {steps.map((s, i) => (
        <motion.div
          key={s.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.1, ease }}
          whileHover={{ y: -4 }}
          className="rounded-3xl border border-white/8 bg-ink-900/50 p-5"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 text-sand-300">{s.icon}</span>
          <p className="mt-4 font-bold">{s.title}</p>
          <p className="mt-1 text-sm text-ink-400">{s.text}</p>
        </motion.div>
      ))}
    </div>
  );
}

function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-[20%] -top-[30%] h-[70vh] w-[70vw] animate-aurora rounded-full bg-[radial-gradient(closest-side,rgb(22_179_172/0.22),transparent)] blur-2xl" />
      <div
        className="absolute -right-[15%] top-[20%] h-[60vh] w-[55vw] animate-aurora rounded-full bg-[radial-gradient(closest-side,rgb(244_102_74/0.16),transparent)] blur-2xl"
        style={{ animationDelay: "-8s" }}
      />
      <div
        className="absolute bottom-[-30%] left-[25%] h-[60vh] w-[60vw] animate-aurora rounded-full bg-[radial-gradient(closest-side,rgb(242_185_90/0.10),transparent)] blur-2xl"
        style={{ animationDelay: "-15s" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
    </div>
  );
}
