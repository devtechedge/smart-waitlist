"use client";

import * as React from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "motion/react";

/**
 * AnimatedCounter
 * ---------------
 * Counts up from 0 to `value` when scrolled into view.
 * Uses framer-motion springs for smooth, natural counting.
 *
 * @example
 *   <AnimatedCounter value={2431} />
 *   <AnimatedCounter value={15432} format="compact" />
 */
export type AnimatedCounterProps = {
  value: number;
  /** "plain" = 2431, "compact" = 2.4K, "comma" = 2,431 */
  format?: "plain" | "compact" | "comma";
  className?: string;
  duration?: number;
};

export function AnimatedCounter({
  value,
  format = "comma",
  className,
  duration = 2,
}: AnimatedCounterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });

  const display = useTransform(springValue, (latest) => {
    const v = Math.round(latest);
    if (format === "compact") {
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
      return v.toString();
    }
    if (format === "comma") return v.toLocaleString();
    return v.toString();
  });

  React.useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  return <motion.span ref={ref} className={className}>{display}</motion.span>;
}
