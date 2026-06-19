import Link from "next/link";

import { FuturisticBackground } from "@/components/landing/futuristic-background";
import { FuturisticHero, FeatureBullets, ArrowRight } from "@/components/landing/futuristic-hero";
import { HowItWorks, StatsBar, FinalCTA, FuturisticFooter } from "@/components/landing/landing-sections";
import { LaunchCountdown } from "@/components/landing/launch-countdown";
import { SocialProofFeed } from "@/components/landing/social-proof-feed";
import { SignupForm } from "@/components/waitlist/signup-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getLandingStats, resolveReferralCode } from "@/lib/queries/waitlist";
import { trackReferralVisitAction } from "@/app/actions/waitlist";
import { ReferralBanner } from "@/components/waitlist/referral-banner";
import { getLaunchSettings, getRecentSignups } from "@/lib/queries/v5-features";

/**
 * Landing page (`/`)
 * ------------------
 * Futuristic, animated landing page with:
 *   - Animated gradient + particle background
 *   - 3D floating hero visual
 *   - Glassmorphic signup form
 *   - Animated stats counters
 *   - "How it works" section
 *   - Final CTA + futuristic footer
 */

export const revalidate = 0;
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ref?: string | string[] }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawRef = params.ref;
  const refCode = Array.isArray(rawRef) ? rawRef[0] : rawRef;

  const [stats, referrerInfo, launchSettings, recentSignups] = await Promise.all([
    getLandingStats(),
    refCode ? resolveReferralCode(refCode) : Promise.resolve(null),
    getLaunchSettings().catch(() => ({ launchDate: null, launchMode: "waitlist" as const })),
    getRecentSignups(10).catch(() => []),
  ]);

  if (refCode && referrerInfo) {
    void trackReferralVisitAction(refCode);
  }

  const user = await getCurrentUser();
  const totalUsers = stats?.totalUsers ?? null;

  return (
    <>
      <FuturisticBackground />

      {/* v5: Social proof feed (rotating signup toasts) */}
      <SocialProofFeed entries={recentSignups} />

      <main className="relative flex flex-1 flex-col">
        {refCode ? <ReferralBanner referrerName={referrerInfo?.referrerName ?? null} /> : null}

        {/* v5: Launch countdown (only if launch date is set) */}
        {launchSettings.launchDate && (
          <div className="flex justify-center py-6">
            <LaunchCountdown launchDate={launchSettings.launchDate} />
          </div>
        )}

        <FuturisticHero totalUsers={totalUsers}>
          {user ? (
            <Button asChild size="lg" className="w-full gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 sm:w-auto">
              <Link href="/dashboard">
                Go to your dashboard
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          ) : (
            <SignupForm
              defaultRefCode={refCode ?? ""}
              redirectPath="/dashboard"
              className="w-full"
            />
          )}
        </FuturisticHero>

        <FeatureBullets />
        <StatsBar totalUsers={totalUsers} />
        <HowItWorks />
        <FinalCTA />
        <FuturisticFooter />
      </main>
    </>
  );
}
