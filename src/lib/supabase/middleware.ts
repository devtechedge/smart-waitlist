import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/public-env";

/**
 * Middleware helper: refresh the Supabase auth session + guard protected
 * routes. Called from `src/middleware.ts` (Phase 5).
 *
 * What this does:
 *   1. Builds a Supabase client backed by the request's cookies.
 *   2. Calls `getUser()` — `@supabase/ssr` will, in the process, refresh the
 *      access token if it has expired and set the refreshed cookies on the
 *      outgoing response.
 *   3. If the user is missing AND the path is auth-gated, redirect to `/`
 *      with a `?redirect=<original-path>` query param so we can deep-link
 *      them back after they sign in.
 *
 * Why we DON'T check admin status here:
 *   Admin status is determined by the `ADMIN_EMAILS` env var, which is
 *  server-only (not available to middleware via `process.env` in some
 *  deployment configurations — and even when it is, a DB call would be
 *  needed for an authoritative check). Admin gating is therefore enforced
 *  inside the admin Server Components / Server Actions via `requireAdmin()`.
 *
 * @returns a `NextResponse` that the middleware should return verbatim.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  // Build a fresh response that we'll mutate as we set cookies.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // First, set on the incoming request so downstream handlers see
          // the refreshed cookies.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // Then, clone the response so the outgoing response carries the
          // refreshed cookies back to the browser.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // IMPORTANT: `getUser()` is the call that triggers token refresh.
  // Do not remove it, and do not replace it with `getSession()` (which is
  // cached and won't refresh).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Routes that require an authenticated user.
  const protectedPrefixes = ["/dashboard", "/admin", "/account"];

  // Routes that should redirect away if the user is ALREADY signed in.
  const authRoutes = ["/signin", "/signup"];

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isAuthRoute = authRoutes.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

/**
 * The set of route prefixes that the middleware should run on.
 * Used by `src/middleware.ts` (Phase 5) via `matcher`.
 *
 * NOTE: this excludes `_next/static`, `_next/image`, `favicon.ico`, and
 * any file with a literal extension (`.svg`, `.png`, etc.) so that static
 * assets aren't bounced through the auth check.
 */
export const middlewareMatcher = [
  /*
   * Match all request paths except for the ones starting with:
   * - _next/static      (static files)
   * - _next/image       (image optimization files)
   * - favicon.ico       (favicon file)
   * - .*\\..*           (any file with an extension, e.g. robots.txt)
   */
  "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
];
