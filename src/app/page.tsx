import Link from "next/link";

import { Hero, ArrowRight } from "@/components/waitlist/hero";
import { ReferralBanner } from "@/components/waitlist/referral-banner";
import { SignupForm } from "@/components/waitlist/signup-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getLandingStats, resolveReferralCode } from "@/lib/queries/waitlist";
import { trackReferralVisitAction } from "@/app/actions/waitlist";

/**
 * Landing page (`/`)
 * ------------------
 * Server Component. Responsibilities:
 *   1. Read `?ref=CODE` from the search params.
 *   2. If present, fire-and-forget `trackReferralVisitAction` (analytics)
 *      and resolve the referrer's display name for the banner.
 *   3. Fetch the live waitlist count for the hero badge.
 *   4. If the user is already signed in, show a "Go to dashboard" CTA
 *      instead of the signup form.
 *
 * This page is dynamically rendered (`revalidate = 0`) because it depends
 * on the auth session cookie and on the `?ref=` search param.
 */

// Always render fresh — auth state and referral codes must not be cached.
export const revalidate = 0;
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ref?: string | string[] }>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawRef = params.ref;
  const refCode = Array.isArray(rawRef) ? rawRef[0] : rawRef;

  // Resolve referral attribution (if any) in parallel with the stats fetch.
  // We intentionally don't await `trackReferralVisitAction` so the page
  // render isn't blocked by analytics.
  const [stats, referrerInfo] = await Promise.all([
    getLandingStats(),
    refCode ? resolveReferralCode(refCode) : Promise.resolve(null),
  ]);

  // Fire the visit-tracking action asynchronously (best-effort, no await).
  if (refCode && referrerInfo) {
    void trackReferralVisitAction(refCode);
  }

  // Check if the visitor is already signed in.
  const user = await getCurrentUser();

  return (
    <main className="flex flex-1 flex-col">
      {refCode ? <ReferralBanner referrerName={referrerInfo?.referrerName ?? null} /> : null}

      <Hero totalUsers={stats?.totalUsers ?? null}>
        {user ? (
          <Button asChild size="lg" className="w-full sm:w-auto">
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
      </Hero>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            Built with Next.js 16 · Supabase · Drizzle ORM · shadcn/ui
          </p>
          <div className="flex items-center gap-4">
            <Link href="/signin" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
