"use client";

import { motion } from "framer-motion";

/** Circular 0–100 gauge whose stroke draws in on mount. */
export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? "var(--color-lagoon-400)" : score >= 70 ? "var(--color-sand-300)" : "var(--color-coral-400)";

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} title={`Value score ${score}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(255 255 255 / 0.08)" strokeWidth={5} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="tabular text-sm font-extrabold leading-none">{score}</span>
      </div>
    </div>
  );
}
