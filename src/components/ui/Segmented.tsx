"use client";

import { motion } from "framer-motion";

interface Option<T extends string> {
  value: T;
  label: React.ReactNode;
}

/** Pill-style segmented control with a sliding, spring-animated indicator. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  id,
  size = "md",
  ariaLabel,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Unique per instance — used as the shared layout id of the indicator. */
  id: string;
  size?: "sm" | "md";
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-full border border-white/10 bg-ink-900/70 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative rounded-full font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon-400 ${
              size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"
            } ${active ? "text-ink-950" : "text-ink-300 hover:text-ink-100"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-sand-300 to-coral-400 shadow-[0_6px_20px_-6px] shadow-coral-500/60"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
