import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/public-env";

/**
 * Supabase Auth Callback (`/auth/callback`)
 * -----------------------------------------
 * Handles the OAuth/email-confirmation redirect from Supabase. Exchanges
 * the `code` query parameter for a session, sets the session cookies, then
 * redirects to `/dashboard` (or the `next` query param if present + safe).
 *
 * We construct the Supabase client inline (rather than using
 * `createSupabaseServerClient`) because we need fine-grained control over
 * the cookie write in a Route Handler context — `@supabase/ssr`'s
 * `createServerClient` is the correct constructor here.
 *
 * Reference:
 *   https://supabase.com/docs/guides/auth/server-side/nextjs
 */

// Always run dynamically — auth callbacks are per-user.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");

  // Default redirect target after a successful exchange.
  const next = safeRedirectPath(nextParam ?? "/dashboard");

  // If there's no code, Supabase sent us here without an auth grant.
  // Send the user to the sign-in page with an explanatory error.
  if (!code) {
    const redirectUrl = new URL("/signin", requestUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set on the request so downstream reads see the new cookies.
            request.cookies.set(name, value);
            // Set on the response so the browser persists them.
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // `exchangeCodeForSession` reads the `code` from the URL and writes the
  // session cookies via the `setAll` callback above.
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Exchange failed — send to sign-in with an error flag.
    const redirectUrl = new URL("/signin?error=auth_callback_failed", requestUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  // Success — redirect to the dashboard (or `next`).
  const redirectUrl = new URL(next, requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}

/**
 * Defensive guard: only allow redirects to same-origin absolute paths or
 * site-relative paths starting with "/". Prevents open-redirect attacks
 * via crafted `?next=https://evil.com` query params.
 *
 * Mirrors `safeRedirectPath` in `src/app/actions/auth.ts` — kept duplicated
 * (not shared) so this route handler has zero non-Supabase dependencies
 * and can be audited in isolation.
 */
function safeRedirectPath(input: string): string {
  if (!input) return "/dashboard";

  if (/^\/\//.test(input) || /^[a-z][a-z0-9+.-]*:/i.test(input)) {
    return "/dashboard";
  }
  if (input.includes("\\")) return "/dashboard";
  if (!input.startsWith("/")) return "/dashboard";

  return input;
}
