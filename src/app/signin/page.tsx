import type { Metadata } from "next";

import { SignInForm } from "@/components/waitlist/signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to check your waitlist position.",
};

// Auth-adjacent route — never cache, never prerender.
export const revalidate = 0;
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ redirect?: string | string[] }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawRedirect = params.redirect;
  const redirectPath = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      <SignInForm redirectPath={redirectPath ?? "/dashboard"} />
    </main>
  );
}
