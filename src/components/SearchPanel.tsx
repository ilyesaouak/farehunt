"use client";

import { AnimatePresence, motion } from "framer-motion";
import { DESTINATIONS, ORIGINS } from "@/lib/airports";
import { LIMITS } from "@/lib/limits";
import { addDays, diffDays, formatDate, formatMinutes } from "@/lib/dates";
import type { DataSource, TripType } from "@/lib/types";
import { MAX_FLEX_DAYS } from "@/lib/validation";
import { BusIcon, CalendarIcon, SearchIcon, TrainIcon, XIcon } from "./ui/icons";
import { Segmented } from "./ui/Segmented";

export interface SearchForm {
  tripType: TripType;
  origins: string[];
  destinations: string[];
  departDate: string;
  returnDate: string;
  flexDays: number;
  demo: boolean;
}

const GROUPS = [
  { label: "Germany", codes: ORIGINS.filter((o) => o.countryCode === "DE").map((o) => o.code) },
  { label: "France & Switzerland", codes: ORIGINS.filter((o) => o.countryCode === "FR").map((o) => o.code) },
  { label: "Italy", codes: ORIGINS.filter((o) => o.countryCode === "IT").map((o) => o.code) },
];

function toggle(list: string[], code: string) {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

export function SearchPanel({
  form,
  onChange,
  onSubmit,
  onCancel,
  loading,
  today,
  source,
}: {
  form: SearchForm;
  onChange: (f: SearchForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  today: string;
  source: DataSource;
}) {
  const set = <K extends keyof SearchForm>(k: K, v: SearchForm[K]) => onChange({ ...form, [k]: v });
  const effectiveSource: DataSource = source === "live" && !form.demo ? "live" : "demo";
  const budget = LIMITS[effectiveSource].maxLookups;
  const lookups = form.origins.length * form.destinations.length * form.flexDays;
  const tripLength = form.tripType === "return" ? diffDays(form.departDate, form.returnDate) : 0;

  const problems: string[] = [];
  if (form.origins.length === 0) problems.push("Pick at least one departure airport");
  if (form.destinations.length === 0) problems.push("Pick at least one destination");
  if (!form.departDate || form.departDate < today) problems.push("Departure date can't be in the past");
  if (form.tripType === "return" && tripLength <= 0) problems.push("Return must be after departure");
  if (lookups > budget) problems.push(`${lookups} lookups exceeds the limit of ${budget} — narrow the search`);
  const valid = problems.length === 0;

  const flexEnd = form.departDate ? addDays(form.departDate, form.flexDays - 1) : "";

  return (
    <motion.form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !loading) onSubmit();
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="glass relative overflow-hidden rounded-3xl p-5 shadow-2xl shadow-black/40 sm:p-7"
    >
      <div className="pointer-events-none absolute -top-24 right-0 h-48 w-2/3 rounded-full bg-coral-500/10 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <Segmented
          id="trip"
          ariaLabel="Trip type"
          value={form.tripType}
          onChange={(v) => set("tripType", v)}
          options={[
            { value: "oneway", label: "One-way" },
            { value: "return", label: "Return" },
          ]}
        />
        {source === "live" && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-300">
            <span>Demo data (saves API quota)</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.demo}
              onClick={() => set("demo", !form.demo)}
              className={`relative h-5 w-9 rounded-full transition-colors ${form.demo ? "bg-lagoon-500" : "bg-ink-700"}`}
            >
              <motion.span layout className={`absolute top-0.5 h-4 w-4 rounded-full bg-white ${form.demo ? "right-0.5" : "left-0.5"}`} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
            </button>
          </label>
        )}
      </div>

      {/* FROM */}
      <fieldset className="relative mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            From · <span className="text-ink-200">{form.origins.length}</span> airports
          </legend>
          <div className="flex gap-1.5 text-xs">
            {[
              { label: "All", codes: ORIGINS.map((o) => o.code) },
              { label: "Within 3h", codes: ORIGINS.filter((o) => o.ground.minutes <= 180).map((o) => o.code) },
              { label: "Germany", codes: GROUPS[0].codes },
              { label: "Clear", codes: [] as string[] },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => set("origins", q.codes)}
                className="rounded-full border border-white/10 px-2.5 py-1 text-ink-300 transition hover:border-lagoon-400/50 hover:text-lagoon-300"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 text-[11px] text-ink-500">{g.label}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {g.codes.map((code) => {
                  const o = ORIGINS.find((a) => a.code === code)!;
                  const on = form.origins.includes(code);
                  const Mode = o.ground.mode === "bus" ? BusIcon : TrainIcon;
                  return (
                    <motion.button
                      key={code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("origins", toggle(form.origins, code))}
                      whileTap={{ scale: 0.96 }}
                      className={`group relative overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                        on ? "border-lagoon-400/60 bg-lagoon-400/10" : "border-white/8 bg-ink-900/50 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`font-mono text-sm font-bold ${on ? "text-lagoon-300" : "text-ink-200"}`}>{code}</span>
                        <motion.span
                          initial={false}
                          animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }}
                          className="h-1.5 w-1.5 rounded-full bg-lagoon-400"
                        />
                      </div>
                      <p className="truncate text-xs text-ink-300">{o.city}</p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-500">
                        <Mode width={11} height={11} /> {formatMinutes(o.ground.minutes)} · ~€{o.ground.costEur}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {/* TO */}
      <fieldset className="relative mt-6">
        <div className="mb-3 flex items-end justify-between">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">To · Tunisia</legend>
          <button
            type="button"
            onClick={() => set("destinations", form.destinations.length === DESTINATIONS.length ? [] : DESTINATIONS.map((d) => d.code))}
            className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-ink-300 transition hover:border-coral-400/50 hover:text-coral-400"
          >
            {form.destinations.length === DESTINATIONS.length ? "Clear" : "All airports"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DESTINATIONS.map((d) => {
            const on = form.destinations.includes(d.code);
            return (
              <motion.button
                key={d.code}
                type="button"
                aria-pressed={on}
                whileTap={{ scale: 0.96 }}
                onClick={() => set("destinations", toggle(form.destinations, d.code))}
                className={`rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                  on ? "border-coral-400/60 bg-coral-500/10" : "border-white/8 bg-ink-900/50 hover:border-white/20"
                }`}
              >
                <span className={`font-mono text-sm font-bold ${on ? "text-coral-400" : "text-ink-200"}`}>{d.code}</span>
                <p className="truncate text-xs text-ink-300">{d.city}</p>
              </motion.button>
            );
          })}
        </div>
      </fieldset>

      {/* DATES */}
      <div className="relative mt-6 grid gap-4 md:grid-cols-[1fr_1fr_1.4fr]">
        <DateField label="Depart" value={form.departDate} min={today} onChange={(v) => {
          const next = { ...form, departDate: v };
          // Keep the trip length when the departure moves past the return.
          if (form.tripType === "return" && v && form.returnDate <= v) next.returnDate = addDays(v, Math.max(tripLength, 7));
          onChange(next);
        }} />
        <AnimatePresence initial={false} mode="popLayout">
          {form.tripType === "return" ? (
            <motion.div key="ret" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
              <DateField
                label="Return"
                value={form.returnDate}
                min={form.departDate ? addDays(form.departDate, 1) : today}
                onChange={(v) => set("returnDate", v)}
                hint={tripLength > 0 ? `${tripLength} nights` : undefined}
              />
            </motion.div>
          ) : (
            <motion.div key="noret" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hidden md:block">
              <div className="flex h-full items-end pb-3 text-xs text-ink-500">No return flight</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <label htmlFor="flex" className="font-semibold uppercase tracking-[0.18em] text-ink-400">
              Flexible dates
            </label>
            <span className="text-ink-300">
              {form.flexDays === 1 ? "Exact date" : `${form.flexDays} days`}
            </span>
          </div>
          <input
            id="flex"
            type="range"
            min={1}
            max={MAX_FLEX_DAYS}
            value={form.flexDays}
            onChange={(e) => set("flexDays", Number(e.target.value))}
            className="w-full"
            style={{ "--fill": `${((form.flexDays - 1) / (MAX_FLEX_DAYS - 1)) * 100}%` } as React.CSSProperties}
          />
          <p className="mt-1 text-[11px] text-ink-500">
            {form.departDate && form.flexDays > 1
              ? `Departing ${formatDate(form.departDate)} – ${formatDate(flexEnd)}${form.tripType === "return" ? `, same trip length` : ""}`
              : "Scan the following days to catch cheaper fares"}
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="relative mt-7 flex flex-col-reverse gap-4 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-[2.5rem] text-xs">
          <AnimatePresence mode="wait">
            {problems.length > 0 ? (
              <motion.p key={problems[0]} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-coral-400">
                {problems[0]}
              </motion.p>
            ) : (
              <motion.div key="ok" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-ink-400">
                <p>
                  <span className="font-semibold text-ink-200">{form.origins.length * form.destinations.length}</span> routes ×{" "}
                  <span className="font-semibold text-ink-200">{form.flexDays}</span> {form.flexDays === 1 ? "day" : "days"} ={" "}
                  <span className="font-semibold text-ink-200">{lookups}</span> lookups
                  {effectiveSource === "live" && <> · {budget - lookups} left in budget</>}
                </p>
                <div className="mt-1.5 h-1 w-48 overflow-hidden rounded-full bg-ink-800">
                  <motion.div className="h-full rounded-full bg-lagoon-400" animate={{ width: `${Math.min(100, (lookups / budget) * 100)}%` }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {loading ? (
          <motion.button
            type="button"
            onClick={onCancel}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-sm font-bold text-ink-100 transition hover:bg-white/5"
          >
            <XIcon /> Cancel scan
          </motion.button>
        ) : (
          <motion.button
            type="submit"
            disabled={!valid}
            whileHover={valid ? { scale: 1.03 } : undefined}
            whileTap={valid ? { scale: 0.97 } : undefined}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-sand-300 via-coral-400 to-coral-500 px-8 py-3.5 text-sm font-extrabold text-ink-950 shadow-[0_10px_40px_-10px] shadow-coral-500/70 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <SearchIcon className="relative" />
            <span className="relative">Find cheapest route</span>
          </motion.button>
        )}
      </div>
    </motion.form>
  );
}

function DateField({
  label,
  value,
  min,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  min: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const id = `date-${label.toLowerCase()}`;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <label htmlFor={id} className="font-semibold uppercase tracking-[0.18em] text-ink-400">
          {label}
        </label>
        {hint && <span className="text-ink-300">{hint}</span>}
      </div>
      <div className="relative">
        <CalendarIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          id={id}
          type="date"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-ink-900/70 py-3 pl-10 pr-3 text-sm font-semibold text-ink-100 outline-none transition focus:border-lagoon-400/60 focus:ring-4 focus:ring-lagoon-400/15"
        />
      </div>
    </div>
  );
}
