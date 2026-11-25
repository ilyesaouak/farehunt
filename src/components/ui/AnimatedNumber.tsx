"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

const euro0 = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const euro2 = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatEuro(value: number, cents = false): string {
  return (cents ? euro2 : euro0).format(value);
}

/** Counts smoothly from the previous value to the new one. */
export function AnimatedNumber({
  value,
  format = (v) => formatEuro(v),
  className,
  duration = 0.9,
}: {
  value: number;
  format?: (v: number) => string;
  className?: string;
  duration?: number;
}) {
  const mv = useMotionValue(value * 0.6);
  const text = useTransform(mv, (v) => format(v));

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [mv, value, duration]);

  return <motion.span className={`tabular ${className ?? ""}`}>{text}</motion.span>;
}
