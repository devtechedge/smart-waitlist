import * as React from "react";
import { Crown, Medal, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPosition } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Leaderboard
 * -----------
 * Server Component. Renders the top-N referrers as a ranked list. The
 * current user's row is highlighted with a subtle accent.
 *
 * Props:
 *   - `entries`    : top-N leaderboard rows (already computed with positions).
 *   - `className`  : optional extra classes.
 *
 * Each entry shape:
 *   { position: number, referralCount: number, fullName: string | null, isMe: boolean }
 */
export type LeaderboardEntry = {
  position: number;
  referralCount: number;
  fullName: string | null;
  isMe: boolean;
};

export type LeaderboardProps = {
  entries: LeaderboardEntry[];
  className?: string;
};

export function Leaderboard({ entries, className }: LeaderboardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="size-5 text-primary" aria-hidden />
          Leaderboard
        </CardTitle>
        <CardDescription>
          Top referrers climbing the queue fastest.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No referrals yet — be the first to share your link!
          </p>
        ) : (
          <ol className="space-y-1">
            {entries.map((entry) => (
              <LeaderboardRow key={entry.position} entry={entry} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/** Internal: one row of the leaderboard. */
function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const rankIcon = getRankIcon(entry.position);
  const displayName = entry.fullName ?? "Anonymous";

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        entry.isMe
          ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
          : "hover:bg-muted/50",
      )}
      aria-current={entry.isMe ? "true" : undefined}
    >
      {/* Rank / position */}
      <div
        className={cn(
          "flex w-8 shrink-0 items-center justify-center text-sm font-semibold tabular-nums",
          entry.position <= 3 ? "text-primary" : "text-muted-foreground",
        )}
      >
        {rankIcon ?? <span>{formatPosition(entry.position)}</span>}
      </div>

      {/* Name */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium">{displayName}</span>
        {entry.isMe ? (
          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
            You
          </span>
        ) : null}
      </div>

      {/* Referral count */}
      <div className="flex shrink-0 items-center gap-1.5 text-sm tabular-nums">
        <span className="font-semibold">{entry.referralCount}</span>
        <span className="text-xs text-muted-foreground">
          {entry.referralCount === 1 ? "referral" : "referrals"}
        </span>
      </div>
    </li>
  );
}

/** Returns a crown/medal icon for top-3 positions, else `null`. */
function getRankIcon(
  position: number,
): React.ReactNode {
  if (position === 1) return <Crown className="size-4" aria-label="1st place" />;
  if (position === 2) return <Medal className="size-4" aria-label="2nd place" />;
  if (position === 3) return <Medal className="size-4 opacity-70" aria-label="3rd place" />;
  return null;
}
