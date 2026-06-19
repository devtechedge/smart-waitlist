"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Users } from "lucide-react";

/**
 * SocialProofFeed
 * ---------------
 * Shows rotating toast-style notifications of recent signups:
 *   "🎉 Sarah from Berlin joined 2 minutes ago"
 *   "👤 Mike from London joined 5 minutes ago"
 *
 * Rotates through the provided entries, showing one at a time at the
 * bottom-left of the screen. Each toast stays for 5s, then fades out
 * and the next one appears.
 *
 * Props:
 *   - entries: recent signups from `getRecentSignups()`
 */
export type SocialProofEntry = {
  id: string;
  displayName: string;
  city: string | null;
  country: string | null;
  minutesAgo: number;
};

export type SocialProofFeedProps = {
  entries: SocialProofEntry[];
  className?: string;
};

export function SocialProofFeed({ entries, className }: SocialProofFeedProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (entries.length === 0) return;

    // Show first toast after 3s delay
    const showTimeout = setTimeout(() => setVisible(true), 3000);

    return () => clearTimeout(showTimeout);
  }, [entries.length]);

  React.useEffect(() => {
    if (entries.length === 0) return;

    // Cycle: show for 5s, hide for 0.5s, show next
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % entries.length);
        setVisible(true);
      }, 500);
    }, 5500);

    return () => clearInterval(cycle);
  }, [entries.length]);

  if (entries.length === 0) return null;

  const entry = entries[currentIndex];
  if (!entry) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`fixed bottom-6 left-6 z-40 ${className ?? ""}`}
          initial={{ opacity: 0, y: 20, x: -20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="glass flex items-center gap-3 rounded-xl border border-indigo-500/20 px-4 py-3 shadow-xl">
            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <Users className="size-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                <span className="gradient-text">{entry.displayName}</span> just joined!
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {entry.city && (
                  <>
                    <MapPin className="size-3" />
                    <span>{entry.city}</span>
                    {entry.country && <span>, {entry.country}</span>}
                  </>
                )}
                <span>· {formatMinutesAgo(entry.minutesAgo)}</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatMinutesAgo(mins: number): string {
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}
