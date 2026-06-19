import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trophy, Users, Calendar, Sparkles, ArrowRight } from "lucide-react";

import { getPublicProfile } from "@/lib/queries/public";
import { formatPosition, formatDate } from "@/lib/format";
import { TierBadge } from "@/components/waitlist/tier-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Params = Promise<{ code: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code } = await params;
  const profile = await getPublicProfile(code);

  if (!profile) {
    return { title: "Profile not found" };
  }

  return {
    title: `${profile.displayName} · Referral Profile`,
    description: `${profile.displayName} is #${formatPosition(profile.position)} on the waitlist with ${profile.referralCount} referrals.`,
    openGraph: {
      title: `${profile.displayName} is #${formatPosition(profile.position)} on the waitlist`,
      description: `${profile.referralCount} referrals · ${profile.tier} tier · Join with their link!`,
      images: [`/api/og?code=${profile.referralCode}`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.displayName} · #${formatPosition(profile.position)} on the waitlist`,
      description: `${profile.referralCount} referrals · Join with their link!`,
      images: [`/api/og?code=${profile.referralCode}`],
    },
  };
}

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function UserProfilePage({ params }: { params: Params }) {
  const { code } = await params;
  const profile = await getPublicProfile(code);

  if (!profile) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="-mt-12 space-y-4">
          <div className="flex items-end justify-between">
            <div className="flex size-24 items-center justify-center rounded-full border-4 border-background bg-primary text-3xl font-bold text-primary-foreground">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
            <TierBadge tier={profile.tier} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">{profile.displayName}</h1>
            <p className="text-sm text-muted-foreground">
              Joined {formatDate(profile.joinedAt)} · Code:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{profile.referralCode}</code>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <StatTile icon={<Trophy className="size-4" aria-hidden />} label="Position" value={formatPosition(profile.position)} />
            <StatTile icon={<Users className="size-4" aria-hidden />} label="Referrals" value={profile.referralCount.toLocaleString()} />
            <StatTile icon={<Calendar className="size-4" aria-hidden />} label="Total" value={profile.totalUsers.toLocaleString()} />
          </div>

          {profile.achievements.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="size-4 text-amber-500" aria-hidden /> Achievements
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.achievements.map((ach) => (
                  <Badge key={ach} variant="secondary" className="gap-1">
                    <Sparkles className="size-3 text-amber-500" aria-hidden /> {ach}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium">Want to skip the line like {profile.displayName}?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Join the waitlist with their referral link and you&apos;ll both climb higher.
            </p>
            <Button asChild className="mt-3 w-full gap-1.5" size="sm">
              <Link href={`/?ref=${profile.referralCode}`}>
                Join with {profile.displayName.split(" ")[0]}&apos;s link
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← View full leaderboard
        </Link>
      </div>
    </main>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}<span>{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
