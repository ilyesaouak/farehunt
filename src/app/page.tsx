"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateRoutes } from "@/lib/generateRoutes";
import { getDealScore, getVerdict } from "@/lib/scoring";
import { formatDuration } from "@/lib/formatters";
import { getGoogleFlightsLink } from "@/lib/links";

interface Route {
  from: string;
  to: string;
  route: string;
  duration: string;
  baggage: string;
  transportPrice: number;
  risk: string;
  flightPrice?: number;
  airline?: string;
  flightDuration?: string;
  currency?: string;
  bestDate?: string;
  offers?: any[];
  googleFlightsUrl?: string;
  totalPrice?: number;
  score?: number;
  verdict?: string;
}

interface Offer {
  id: string;
  airline: string;
  duration: string;
  price: number;
  currency: string;
}

interface Particle {
  x: number;
  y: number;
  id: number;
}

const homeCity = "Heidelberg";

const airportNames: Record<string, string> = {
  STR: "Stuttgart Airport",
  FRA: "Frankfurt Airport",
  DUS: "Düsseldorf Airport",
  CGN: "Cologne Bonn Airport",
  FKB: "Karlsruhe Baden-Baden Airport",
  BSL: "Basel Mulhouse Airport",
  CDG: "Paris Charles de Gaulle Airport",
  ORY: "Paris Orly Airport",
  MRS: "Marseille Airport",
  MXP: "Milan Malpensa Airport",
};

function getAirportName(code: string) {
  return airportNames[code] ?? `${code} Airport`;
}

function formatDateForDB(date: string) {
  return date;
}

function formatDateForFlix(date: string) {
  const d = new Date(date);

  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1
  ).padStart(2, "0")}.${d.getFullYear()}`;
}

function getBahnLink(toAirportCode: string, date: string) {
  const to = getAirportName(toAirportCode);

  return `https://int.bahn.de/en/buchung/fahrplan/suche#sts=true&so=${encodeURIComponent(
    homeCity
  )}&zo=${encodeURIComponent(to)}&kl=2&hd=${formatDateForDB(date)}`;
}

function getFlixBusLink(toAirportCode: string, date: string) {
  const to = getAirportName(toAirportCode);

  return `https://shop.flixbus.com/search?departureCity=${encodeURIComponent(
    homeCity
  )}&arrivalCity=${encodeURIComponent(to)}&rideDate=${formatDateForFlix(
    date
  )}&adult=1`;
}

const GlowingButton = ({
  children,
  onClick,
  disabled,
  loading,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    disabled={disabled || loading}
    className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
    <span className="relative z-10">{loading ? "Scanning..." : children}</span>
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
      animate={{ x: ["-100%", "100%"] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      style={{ filter: "blur(8px)" }}
    />
  </motion.button>
);

const InputField = ({ label, ...props }: { label: string; [key: string]: any }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-slate-300">{label}</label>
    <motion.input
      whileFocus={{ scale: 1.01 }}
      className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none backdrop-blur-sm transition-all duration-200 placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
      {...props}
    />
  </div>
);

const SelectField = ({
  label,
  children,
  ...props
}: {
  label: string;
  children: React.ReactNode;
  [key: string]: any;
}) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-slate-300">{label}</label>
    <motion.select
      whileFocus={{ scale: 1.01 }}
      className="w-full rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 text-sm text-white outline-none backdrop-blur-sm transition-all duration-200 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
      {...props}
    >
      {children}
    </motion.select>
  </div>
);

export default function Home() {
  const [origin, setOrigin] = useState("Anywhere");
  const [destination, setDestination] = useState("Tunisia");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxRisk, setMaxRisk] = useState("All");
  const [date, setDate] = useState("2026-05-10");
  const [scanDays, setScanDays] = useState("5");
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalChecks, setTotalChecks] = useState(0);
  const [tripType, setTripType] = useState("oneway");
  const [returnDate, setReturnDate] = useState("2026-05-20");
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 40 }, (_, i) => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        id: i,
      }))
    );
  }, []);

  async function searchFlights() {
    setLoading(true);
    setSearched(true);
    setProgress(0);
    setRoutes([]);

    const generated = generateRoutes(origin, destination);
    const results: any[] = [];

    const dates = Array.from({ length: Number(scanDays) }).map((_, i) => {
      const d = new Date(date);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    setTotalChecks(generated.length * dates.length);

    await Promise.all(
      generated.map(async (route: Route) => {
        let bestFlight: any = null;

        for (const d of dates) {
          try {
            const params = new URLSearchParams({
              origin: route.from,
              destination: route.to,
              date: d,
              tripType,
            });

            if (tripType === "return") {
              params.set("returnDate", returnDate);
            }

            const res = await fetch(`/api/flights?${params.toString()}`);
            const data = await res.json();

            if (data.cheapest) {
              if (!bestFlight || data.cheapest.price < bestFlight.price) {
                bestFlight = {
                  ...data.cheapest,
                  date: d,
                  offers: data.flights ?? [],
                  googleFlightsUrl: data.googleFlightsUrl,
                };
              }
            }
          } catch (err) {
            console.error("Flight search error:", err);
          } finally {
            setProgress((prev) => prev + 1);
          }
        }

        if (bestFlight) {
          results.push({
            ...route,
            flightPrice: bestFlight.price,
            airline: bestFlight.airline,
            flightDuration: bestFlight.duration,
            currency: bestFlight.currency,
            bestDate: bestFlight.date,
            offers: bestFlight.offers,
            googleFlightsUrl: bestFlight.googleFlightsUrl,
          });
        }
      })
    );

    setRoutes(results);
    setLoading(false);
  }

  const baseRoutes = searched ? routes : generateRoutes(origin, destination);

  const routesWithScore = baseRoutes.map((route: Route) => {
    const totalPrice = Number(route.flightPrice) + Number(route.transportPrice);

    return {
      ...route,
      totalPrice,
      score: getDealScore(totalPrice, route.risk),
      verdict: getVerdict(totalPrice, route.risk),
    };
  });

  const filteredRoutes = routesWithScore
    .filter((route: Route) => !maxPrice || route.totalPrice! <= Number(maxPrice))
    .filter((route: Route) => maxRisk === "All" || route.risk === maxRisk)
    .sort((a: Route, b: Route) => (b.score || 0) - (a.score || 0));

  const bestRoute = filteredRoutes[0];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-950 via-indigo-950/20 to-purple-950/30 text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute h-0.5 w-0.5 rounded-full bg-cyan-400/20"
            initial={{ x: particle.x, y: particle.y }}
            animate={{
              x: [particle.x, particle.x + (Math.random() - 0.5) * 150, particle.x],
              y: [particle.y, particle.y + (Math.random() - 0.5) * 150, particle.y],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
        ))}
        <div className="absolute -left-64 -top-64 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -right-64 top-1/2 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl" />
        <div className="absolute -bottom-64 left-1/2 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 backdrop-blur-xl">
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
                  ✈️ FareHunt
                </div>
                <h1 className="text-base font-black tracking-tight md:text-lg">
                  Cheapest route{" "}
                  <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    anywhere → Tunisia
                  </span>
                </h1>
              </div>

              <div className="flex gap-2">
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                  <p className="text-[10px] text-slate-400">Routes</p>
                  <p className="text-base font-bold text-cyan-300">{filteredRoutes.length}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                  <p className="text-[10px] text-slate-400">Best price</p>
                  <p className="text-base font-bold text-emerald-300">
                    {bestRoute ? `€${bestRoute.totalPrice?.toFixed(0)}` : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                  <p className="text-[10px] text-slate-400">Mode</p>
                  <p className="text-base font-bold text-purple-300">
                    {tripType === "return" ? "Return" : "One-way"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">Search Controls</h2>
                <p className="text-[11px] text-slate-400">Find the best flight + airport transport combo</p>
              </div>
              <p className="text-[11px] text-slate-400">
                {searched && !loading ? "✅ Data loaded" : "✨ Ready to search"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
              <InputField label="From" value={origin} onChange={(e: any) => { setOrigin(e.target.value); setRoutes([]); setSearched(false); }} placeholder="Anywhere" />
              <InputField label="To" value={destination} onChange={(e: any) => { setDestination(e.target.value); setRoutes([]); setSearched(false); }} placeholder="Tunisia" />

              <SelectField label="Type" value={tripType} onChange={(e: any) => { setTripType(e.target.value); setRoutes([]); setSearched(false); }}>
                <option className="bg-slate-900 text-white" value="oneway">One-way</option>
                <option className="bg-slate-900 text-white" value="return">Return</option>
              </SelectField>

              <InputField label="Depart" type="date" value={date} onChange={(e: any) => { setDate(e.target.value); setRoutes([]); setSearched(false); }} />

              {tripType === "return" && (
                <InputField label="Return" type="date" value={returnDate} onChange={(e: any) => { setReturnDate(e.target.value); setRoutes([]); setSearched(false); }} />
              )}

              <SelectField label="Scan days" value={scanDays} onChange={(e: any) => { setScanDays(e.target.value); setRoutes([]); setSearched(false); }}>
                <option className="bg-slate-900 text-white" value="3">3 days</option>
                <option className="bg-slate-900 text-white" value="5">5 days</option>
                <option className="bg-slate-900 text-white" value="7">7 days</option>
                <option className="bg-slate-900 text-white" value="14">14 days</option>
              </SelectField>

              <InputField label="Max price" type="number" value={maxPrice} onChange={(e: any) => setMaxPrice(e.target.value)} placeholder="Any" />

              <SelectField label="Risk level" value={maxRisk} onChange={(e: any) => setMaxRisk(e.target.value)}>
                <option className="bg-slate-900 text-white">All</option>
                <option className="bg-slate-900 text-white">Low</option>
                <option className="bg-slate-900 text-white">Medium</option>
                <option className="bg-slate-900 text-white">High</option>
              </SelectField>

              <div className="flex items-end">
                <GlowingButton onClick={searchFlights} disabled={loading || !date} loading={loading} className="w-full">
                  Search
                </GlowingButton>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-6 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 backdrop-blur-xl">
              <div className="mb-2 flex justify-between text-xs">
                <p className="font-semibold text-cyan-200">Searching flights...</p>
                <p className="text-[10px] text-slate-400">{progress}/{totalChecks}</p>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" animate={{ width: totalChecks ? `${(progress / totalChecks) * 100}%` : "0%" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-4">
          {filteredRoutes.map((route: Route, index: number) => (
            <motion.div
              key={`${route.from}-${route.to}-${route.route}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onHoverStart={() => setHoveredRoute(route.route)}
              onHoverEnd={() => setHoveredRoute(null)}
              className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/30 hover:shadow-lg"
            >
              <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {index === 0 && (
                      <span className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-2 py-0.5 text-[10px] font-black text-slate-950">
                        ⭐ BEST DEAL
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                      {route.from} → {route.to}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold">{route.route}</h3>
                  <p className="mt-1 text-[11px] text-slate-400">{route.duration} · {route.baggage}</p>

                  {route.airline && (
                    <p className="mt-1.5 text-[11px] text-slate-300">
                      ✈️ {route.airline} · {formatDuration(route.flightDuration || "")}
                    </p>
                  )}

                  {route.bestDate && (
                    <p className="mt-1.5 text-[11px] font-medium text-emerald-300">
                      🟢 Best date: {route.bestDate}
                    </p>
                  )}
                </div>

                <div className="text-left md:text-right">
                  <p className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-2xl font-black text-transparent">
                    €{route.totalPrice?.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Flight €{Number(route.flightPrice).toFixed(0)} + transport €{route.transportPrice}
                  </p>

                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    href={route.googleFlightsUrl ?? getGoogleFlightsLink(route.from, route.to, route.bestDate || date)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:shadow-emerald-500/30"
                  >
                    View & Book →
                  </motion.a>
                </div>
              </div>

              <div className="relative z-10 mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                  ⚠️ Risk: {route.risk}
                </span>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-200">
                  🎯 Score: {route.score}/100
                </span>
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-200">
                  {route.verdict}
                </span>
              </div>

              <div className="relative z-10 mt-4 border-t border-white/10 pt-4">
                <p className="mb-2 text-xs font-medium text-slate-300">🚆 Ground transport to airport</p>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                    <p className="text-xs font-semibold">{homeCity} → {getAirportName(route.from)}</p>
                    <p className="text-[10px] text-slate-400">Estimated transport: €{route.transportPrice}</p>
                  </div>

                  <a
                    href={getBahnLink(route.from, route.bestDate || date)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-red-400/20 bg-red-500/10 p-2.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                  >
                    🚄 Book DB train
                    <p className="mt-1 text-[10px] font-normal text-red-100/70">Deutsche Bahn</p>
                  </a>

                  <a
                    href={getFlixBusLink(route.from, route.bestDate || date)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                  >
                    🚌 Check FlixBus
                    <p className="mt-1 text-[10px] font-normal text-emerald-100/70">Bus option</p>
                  </a>
                </div>
              </div>

              {route.offers && route.offers.length > 0 && (
                <div className="relative z-10 mt-4 border-t border-white/10 pt-4">
                  <p className="mb-2 text-xs font-medium text-slate-300">✨ Alternative offers</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {route.offers.slice(0, 3).map((offer: Offer) => (
                      <div key={offer.id} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                        <p className="text-xs font-semibold">{offer.airline}</p>
                        <p className="text-[10px] text-slate-400">{formatDuration(offer.duration)}</p>
                        <p className="mt-1 text-sm font-black text-cyan-300">
                          {offer.currency} {Number(offer.price).toFixed(0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}