"use client";

import { AnimatePresence, motion } from "framer-motion";
import { DESTINATIONS, HOME, ORIGINS } from "@/lib/airports";

/* Equirectangular projection tuned for the Heidelberg → Tunisia corridor. */
const LON0 = 0.6;
const LAT1 = 52.5;
const S = 22;
const K = 1; // stretched horizontally so the airports spread across the card
const W = 320;
const H = 460;

const px = (lon: number) => 14 + (lon - LON0) * K * S;
const py = (lat: number) => (LAT1 - lat) * S;
const pt = (a: { lat: number; lon: number }) => ({ x: px(a.lon), y: py(a.lat) });

/** Rough outline of Tunisia — enough to anchor the destination visually. */
const TUNISIA: [number, number][] = [
  [8.4, 36.9], [9.8, 37.35], [10.3, 37.1], [11.1, 37.1], [10.5, 36.4], [11.1, 35.6],
  [10.8, 34.8], [10.1, 34.3], [10.3, 33.7], [11.2, 33.2], [11.55, 32.9], [11.4, 32.2],
  [10.3, 31.7], [9.6, 31.8], [9.1, 32.1], [7.8, 33.2], [8.2, 34.6], [8.4, 35.5], [8.3, 36.5],
];
const tunisiaPath = "M" + TUNISIA.map(([lon, lat]) => `${px(lon).toFixed(1)},${py(lat).toFixed(1)}`).join("L") + "Z";

function arc(a: { x: number; y: number }, b: { x: number; y: number }, bend = 0.22) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // Control point perpendicular to the chord → a gentle "great circle" bow.
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
}

export function RouteMap({
  origins,
  destinations,
  highlight,
}: {
  origins: string[];
  destinations: string[];
  highlight?: { origin: string; destination: string } | null;
}) {
  const home = pt(HOME);
  const selO = new Set(origins);
  const selD = new Set(destinations);
  const pairs = ORIGINS.filter((o) => selO.has(o.code)).flatMap((o) =>
    DESTINATIONS.filter((d) => selD.has(d.code)).map((d) => ({ o, d, id: `${o.code}-${d.code}` })),
  );
  const hl = highlight ? pairs.find((p) => p.o.code === highlight.origin && p.d.code === highlight.destination) : undefined;
  const hlPath = hl ? arc(pt(hl.o), pt(hl.d)) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Map of the selected departure airports and Tunisian destinations">
      <defs>
        <radialGradient id="sea" cx="50%" cy="78%" r="55%">
          <stop offset="0%" stopColor="#16b3ac" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#16b3ac" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="arc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7d28c" />
          <stop offset="100%" stopColor="#ff8a6b" />
        </linearGradient>
        <pattern id="dots" width="11" height="11" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="rgb(255 255 255 / 0.07)" />
        </pattern>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={W} height={H} fill="url(#dots)" />
      <ellipse cx={W * 0.5} cy={py(39)} rx={W * 0.6} ry={H * 0.28} fill="url(#sea)" />
      <text x={px(3.2)} y={py(40.2)} className="fill-lagoon-300/35 text-[9px] font-semibold tracking-[0.35em]">
        MEDITERRANEAN
      </text>

      <motion.path
        d={tunisiaPath}
        fill="rgb(247 210 140 / 0.07)"
        stroke="rgb(247 210 140 / 0.35)"
        strokeWidth={1}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />

      {/* Ground legs: home → each selected airport */}
      <AnimatePresence>
        {ORIGINS.filter((o) => selO.has(o.code)).map((o) => {
          const p = pt(o);
          return (
            <motion.line
              key={`g-${o.code}`}
              x1={home.x}
              y1={home.y}
              x2={p.x}
              y2={p.y}
              stroke="rgb(124 231 224 / 0.35)"
              strokeWidth={1}
              strokeDasharray="2 3"
              initial={{ opacity: 0 }}
              animate={{ opacity: hl && hl.o.code !== o.code ? 0.25 : 1 }}
              exit={{ opacity: 0 }}
            />
          );
        })}
      </AnimatePresence>

      {/* Flight arcs */}
      <AnimatePresence>
        {pairs.map(({ o, d, id }, i) => {
          const active = hl?.id === id;
          return (
            <motion.path
              key={id}
              d={arc(pt(o), pt(d))}
              fill="none"
              stroke={active ? "url(#arc)" : "rgb(255 255 255 / 0.16)"}
              strokeWidth={active ? 2.2 : 0.9}
              strokeLinecap="round"
              filter={active ? "url(#glow)" : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: hl && !active ? 0.35 : 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 1.1, delay: Math.min(i * 0.025, 0.6), ease: [0.16, 1, 0.3, 1] }}
            />
          );
        })}
      </AnimatePresence>

      {/* Plane travelling along the highlighted route */}
      {hlPath && (
        <g key={hlPath} filter="url(#glow)">
          <path d="M-5,-3 L6,0 L-5,3 L-3,0 Z" fill="#fbe6bd">
            <animateMotion dur="3.2s" repeatCount="indefinite" rotate="auto" path={hlPath} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" />
          </path>
        </g>
      )}

      {/* Origin airports */}
      {ORIGINS.map((o) => {
        const p = pt(o);
        const on = selO.has(o.code);
        const active = hl?.o.code === o.code;
        return (
          <g key={o.code} transform={`translate(${p.x},${p.y})`}>
            <motion.circle
              r={active ? 4.5 : 3}
              fill={on ? (active ? "#f7d28c" : "#eef1f8") : "rgb(255 255 255 / 0.2)"}
              animate={{ scale: on ? 1 : 0.7 }}
            />
            {active && (
              <motion.circle r={4} fill="none" stroke="#f7d28c" initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 1.6, repeat: Infinity }} />
            )}
            <text
              x={6}
              y={3}
              className={`font-mono text-[8px] font-semibold ${active ? "fill-sand-300" : on ? "fill-ink-200" : "fill-ink-500"}`}
            >
              {o.code}
            </text>
          </g>
        );
      })}

      {/* Home */}
      <g transform={`translate(${home.x},${home.y})`}>
        <circle r={9} fill="rgb(63 212 203 / 0.12)" className="animate-pulse" />
        <rect x={-3.5} y={-3.5} width={7} height={7} rx={1.5} fill="#3fd4cb" transform="rotate(45)" />
        <text x={-8} y={3} textAnchor="end" className="fill-lagoon-300 text-[8.5px] font-bold">
          {HOME.city}
        </text>
      </g>

      {/* Destinations */}
      {DESTINATIONS.map((d) => {
        const p = pt(d);
        const on = selD.has(d.code);
        const active = hl?.d.code === d.code;
        return (
          <g key={d.code} transform={`translate(${p.x},${p.y})`}>
            <motion.circle r={active ? 5 : 3.5} fill={on ? "#ff8a6b" : "rgb(255 138 107 / 0.25)"} animate={{ scale: active ? [1, 1.25, 1] : 1 }} transition={{ duration: 1.4, repeat: active ? Infinity : 0 }} />
            <text x={8} y={3} className={`text-[8.5px] font-bold ${on ? "fill-coral-400" : "fill-ink-500"}`}>
              {d.city}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
