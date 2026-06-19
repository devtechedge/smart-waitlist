import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertCircle, Sparkles } from "lucide-react";

import { DashboardNav } from "@/components/waitlist/dashboard-nav";
import { PositionCard } from "@/components/waitlist/position-card";
import { ReferralShareBox } from "@/components/waitlist/referral-share-box";
import { Leaderboard } from "@/components/waitlist/leaderboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrClaimMyWaitlistEntryAction } from "@/app/actions/waitlist";
import { getCurrentUser } from "@/lib/queries/waitlist";
import { isAdminEmail } from "@/lib/server-env";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your waitlist position, referral link, and leaderboard.",
  robots: { index: false, follow: false },
};

// Auth-gated page — never cache, never prerender.
export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Hard redirect to home if unauthenticated. (The middleware also catches
  // this, but we double-guard in case middleware is bypassed.)
  if (!user) {
    redirect("/?redirect=/dashboard");
  }

  // Claim-or-create the waitlist entry for this user. Idempotent — safe to
  // call on every dashboard visit.
  const result = await getOrClaimMyWaitlistEntryAction();

  if (!result.ok) {
    return (
      <>
        <DashboardNav userEmail={user.email} showAdmin={isAdminEmail(user.email)} active="dashboard" />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md border-destructive/30">
            <CardHeader className="items-center text-center">
              <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="size-6" aria-hidden />
              </div>
              <CardTitle className="text-xl">Couldn&apos;t load your spot</CardTitle>
              <CardDescription>{result.error}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild variant="outline">
                <a href="/dashboard">Try again</a>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const { entry, position, referralLink } = result;

  // Build the leaderboard payload from the dashboard query (top 10).
  // We re-fetch via the dashboard query so the leaderboard reflects the
  // latest ranking — `getOrClaimMyWaitlistEntryAction` only returns the
  // current user's entry.
  const { getDashboardData } = await import("@/lib/queries/waitlist");
  const dashboardData = await getDashboardData();
  const leaderboard = dashboardData?.leaderboard ?? [];

  return (
    <>
      <DashboardNav
        userEmail={user.email}
        showAdmin={isAdminEmail(user.email)}
        active="dashboard"
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {/* Welcome header */}
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user.fullName ?? user.email.split("@")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s how you&apos;re doing on the waitlist. Share your link
            to climb higher.
          </p>
        </div>

        {/* Top section: position + share */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <PositionCard
            position={position}
            totalUsers={result.entry.referralCount > 0 ? Math.max(leaderboard.length, position) : position}
            referralCount={entry.referralCount}
            joinedAt={entry.createdAt}
            status={entry.status}
            className="lg:col-span-3"
          />

          <ReferralShareBox
            referralLink={referralLink}
            referralCount={entry.referralCount}
            referralCode={entry.referralCode}
            className="lg:col-span-2"
          />
        </div>

        {/* How referrals work (info card) */}
        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-5 text-primary" aria-hidden />
              How to climb the queue
            </CardTitle>
            <CardDescription>
              The more friends you refer, the higher you climb.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Step
                n={1}
                title="Share your link"
                description="Post it on social media, send it to friends, drop it in group chats."
              />
              <Step
                n={2}
                title="They sign up"
                description="Each friend who creates an account using your link counts as a referral."
              />
              <Step
                n={3}
                title="You move up"
                description="More referrals = higher rank = earlier access to the product."
              />
            </ol>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Leaderboard entries={leaderboard} className="mt-6" />
      </main>
    </>
  );
}

/** Internal: numbered step in the "How to climb" card. */
function Step({
  n,
  title,
  description,
}: {
  n: number;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {n}
      </span>
      <div className="space-y-0.5">
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}
