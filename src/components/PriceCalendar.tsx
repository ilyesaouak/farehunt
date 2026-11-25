"use client";

import { motion } from "framer-motion";
import { formatDate } from "@/lib/dates";
import type { DateQuote } from "@/lib/types";
import { formatEuro } from "./ui/AnimatedNumber";

/** Cheapest fare per scanned departure date, as animated bars. */
export function PriceCalendar({ quotes, bestDate, groundCost }: { quotes: DateQuote[]; bestDate: string; groundCost: number }) {
  const prices = quotes.map((q) => (q.offers[0] ? q.offers[0].price + groundCost : null));
  const valid = prices.filter((p): p is number => p !== null);
  if (valid.length === 0) return null;
  const max = Math.max(...valid);
  const min = Math.min(...valid);

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Total price by departure date</p>
      <div className="flex h-36 items-end gap-2">
        {quotes.map((q, i) => {
          const p = prices[i];
          const best = q.date === bestDate;
          // Map to 30–100% height so the cheapest bar is still visible.
          const h = p === null ? 8 : max === min ? 70 : 30 + ((p - min) / (max - min)) * 70;
          return (
            <div key={q.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className={`tabular text-[10px] font-bold ${best ? "text-sand-300" : "text-ink-300"}`}>
                {p === null ? "—" : formatEuro(p)}
              </span>
              <motion.div
                className={`w-full max-w-12 rounded-t-lg ${
                  p === null
                    ? "bg-ink-800"
                    : best
                      ? "bg-gradient-to-t from-coral-500 to-sand-300 shadow-[0_0_24px_-4px] shadow-coral-500/60"
                      : "bg-gradient-to-t from-ink-700 to-ink-500"
                }`}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                title={q.error ? `Lookup failed: ${q.error}` : p === null ? "No flights" : undefined}
              />
              <span className={`text-[10px] ${best ? "font-bold text-sand-200" : "text-ink-500"}`}>
                {formatDate(q.date, { weekday: "short", day: "numeric" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
