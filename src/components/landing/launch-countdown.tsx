"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Rocket } from "lucide-react";

/**
 * LaunchCountdown
 * ---------------
 * A futuristic countdown timer to the launch date. Shows days/hours/minutes/seconds
 * with animated digit flips. When the countdown reaches zero, shows "We're live!".
 *
 * Props:
 *   - launchDate: the target date (null = no countdown shown)
 */
export type LaunchCountdownProps = {
  launchDate: Date | string | null;
  className?: string;
};

export function LaunchCountdown({ launchDate, className }: LaunchCountdownProps) {
  const [timeLeft, setTimeLeft] = React.useState(getTimeLeft(launchDate));
  const [isLaunched, setIsLaunched] = React.useState(false);

  React.useEffect(() => {
    if (!launchDate) return;

    const interval = setInterval(() => {
      const left = getTimeLeft(launchDate);
      setTimeLeft(left);

      if (left.total <= 0) {
        setIsLaunched(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [launchDate]);

  if (!launchDate) return null;

  if (isLaunched) {
    return (
      <motion.div
        className={`glass flex items-center gap-3 rounded-2xl px-6 py-4 ${className ?? ""}`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <Rocket className="size-8 text-green-400" />
        <div>
          <div className="text-lg font-bold gradient-text">We&apos;re live!</div>
          <div className="text-xs text-muted-foreground">The wait is over — access is open.</div>
        </div>
      </motion.div>
    );
  }

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Mins", value: timeLeft.minutes },
    { label: "Secs", value: timeLeft.seconds },
  ];

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Rocket className="size-4 text-indigo-400" />
        <span>Launch countdown</span>
      </div>
      <div className="flex gap-3">
        {units.map((unit) => (
          <motion.div
            key={unit.label}
            className="glass flex min-w-[72px] flex-col items-center rounded-xl px-4 py-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              key={unit.value}
              className="text-3xl font-bold tabular-nums gradient-text"
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {String(unit.value).padStart(2, "0")}
            </motion.div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {unit.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function getTimeLeft(target: Date | string | null): {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  if (!target) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  const targetDate = typeof target === "string" ? new Date(target) : target;
  const total = Math.max(0, targetDate.getTime() - Date.now());

  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}
