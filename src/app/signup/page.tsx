import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/components/waitlist/signup-form";
import { ReferralBanner } from "@/components/waitlist/referral-banner";
import { resolveReferralCode } from "@/lib/queries/waitlist";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description: "Create your account and claim your spot in line.",
};

// Auth-gated adjacent route — never cache, never prerender.
export const revalidate = 0;
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ref?: string | string[]; redirect?: string | string[] }>;

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawRef = params.ref;
  const refCode = Array.isArray(rawRef) ? rawRef[0] : rawRef;
  const rawRedirect = params.redirect;
  const redirectPath = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect;

  // Resolve referrer name for the banner (if `?ref=` is present).
  const referrerInfo = refCode ? await resolveReferralCode(refCode) : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      {refCode ? (
        <ReferralBanner
          referrerName={referrerInfo?.referrerName ?? null}
          className="mb-6"
        />
      ) : null}

      <SignupForm
        defaultRefCode={refCode ?? ""}
        redirectPath={redirectPath ?? "/dashboard"}
      />

      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
        By signing up, you agree to receive product updates. We&apos;ll never
        spam you — unsubscribe anytime. Read our{" "}
        <Link href="/" className="underline-offset-4 hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </main>
  );
}
