import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Medal, Trophy, Users } from "lucide-react";

import { getPublicLeaderboard, type PublicLeaderboardEntry } from "@/lib/queries/public";
import { formatPosition } from "@/lib/format";
import { TierBadge } from "@/components/waitlist/tier-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Top referrers climbing the waitlist queue. See who's bringing in the most signups.",
  openGraph: {
    title: "Smart Waitlist Leaderboard",
    description: "Top referrers climbing the queue. Join the competition!",
  },
};

export const revalidate = 60; // Revalidate every 60s
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const entries = await getPublicLeaderboard(100);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <Trophy className="size-7" aria-hidden />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Hall of Fame
        </h1>
        <p className="mt-2 text-muted-foreground">
          The top {entries.length} referrers climbing the queue fastest.
        </p>
      </div>

      {/* Podium — top 3 */}
      {entries.length >= 3 && (
        <div className="mb-10 grid grid-cols-3 gap-2 sm:gap-4">
          <PodiumCard entry={entries[1]!} place={2} />
          <PodiumCard entry={entries[0]!} place={1} />
          <PodiumCard entry={entries[2]!} place={3} />
        </div>
      )}

      {/* Full leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" aria-hidden />
            Top 100 Referrers
          </CardTitle>
          <CardDescription>
            Ranked by tier priority, then referral count, then join date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No referrals yet — be the first to share your link!
            </p>
          ) : (
            <ol className="space-y-1">
              {entries.map((entry) => (
                <LeaderboardRow key={entry.referralCode} entry={entry} />
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Want to climb the leaderboard?
        </p>
        <Link
          href="/"
          className="mt-2 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Join the waitlist
        </Link>
      </div>
    </main>
  );
}

/** Podium card for top 3. */
function PodiumCard({ entry, place }: { entry: PublicLeaderboardEntry; place: 1 | 2 | 3 }) {
  const styles = {
    1: { bg: "bg-amber-500/10", border: "border-amber-500/30", icon: Crown, iconColor: "text-amber-500", height: "mt-0 sm:mt-0", label: "1st" },
    2: { bg: "bg-slate-400/10", border: "border-slate-400/30", icon: Medal, iconColor: "text-slate-400", height: "mt-4 sm:mt-6", label: "2nd" },
    3: { bg: "bg-orange-700/10", border: "border-orange-700/30", icon: Medal, iconColor: "text-orange-700", height: "mt-8 sm:mt-10", label: "3rd" },
  }[place];

  const Icon = styles.icon;

  return (
    <div className={`${styles.height}`}>
      <div className={`flex flex-col items-center gap-2 rounded-lg border ${styles.border} ${styles.bg} p-3 sm:p-4`}>
        <Icon className={`size-6 ${styles.iconColor}`} aria-hidden />
        <span className="text-xs font-semibold text-muted-foreground">{styles.label}</span>
        <Link
          href={`/u/${entry.referralCode}`}
          className="text-center text-sm font-semibold hover:underline"
        >
          {entry.displayName}
        </Link>
        <TierBadge tier={entry.tier} iconOnly />
        <span className="text-lg font-bold tabular-nums">{entry.referralCount}</span>
        <span className="text-[10px] text-muted-foreground">
          {entry.referralCount === 1 ? "referral" : "referrals"}
        </span>
      </div>
    </div>
  );
}

/** Single leaderboard row. */
function LeaderboardRow({ entry }: { entry: PublicLeaderboardEntry }) {
  const isTop3 = entry.position <= 3;

  return (
    <li className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
      <div className={`w-8 shrink-0 text-center text-sm font-semibold tabular-nums ${isTop3 ? "text-primary" : "text-muted-foreground"}`}>
        {formatPosition(entry.position)}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          href={`/u/${entry.referralCode}`}
          className="truncate text-sm font-medium hover:underline"
        >
          {entry.displayName}
        </Link>
        {entry.tier !== "free" && <TierBadge tier={entry.tier} iconOnly className="shrink-0" />}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-sm tabular-nums">
        <span className="font-semibold">{entry.referralCount}</span>
        <span className="text-xs text-muted-foreground">
          {entry.referralCount === 1 ? "referral" : "referrals"}
        </span>
      </div>
    </li>
  );
}
