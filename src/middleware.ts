import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js Middleware — Supabase Auth Session Refresh + Route Guard
 * ----------------------------------------------------------------
 * Runs on every matched request (see `matcher` below). Delegates to
 * `updateSession()` which:
 *   1. Constructs a Supabase client backed by the request cookies.
 *   2. Calls `getUser()` — this triggers a token refresh if the access
 *      token has expired, and sets the refreshed cookies on the response.
 *   3. Redirects unauthenticated users away from protected routes
 *      (`/dashboard`, `/admin`, `/account`) to `/?redirect=<original-path>`.
 *   4. Redirects already-authenticated users away from `/signin` and
 *      `/signup` to `/dashboard`.
 *
 * Why middleware (not just page-level guards)?
 *   - Token refresh happens BEFORE the page renders, so Server Components
 *     always see a valid session.
 *   - Redirects happen at the edge, avoiding a full server render for
 *     unauthorized requests.
 *   - The middleware runs on Vercel's Edge Runtime by default, which is
 *     globally distributed and fast.
 *
 * Admin authorization is NOT checked here — it requires the `ADMIN_EMAILS`
 * env var (server-only) and is enforced inside the `/admin` page + query
 * layer via `requireAdmin()`. This keeps middleware fast and stateless.
 *
 * Reference: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

export async function middleware(request: Parameters<typeof updateSession>[0]) {
  return updateSession(request);
}

/**
 * Matcher — controls which paths middleware runs on.
 *
 * MUST be a static literal (Next.js parses this at build time — it cannot
 * reference imported variables). Kept in sync with `middlewareMatcher` in
 * `src/lib/supabase/middleware.ts`.
 *
 * Excludes:
 *   - `_next/static`        : static build assets
 *   - `_next/image`         : image optimization endpoint
 *   - `favicon.ico`         : favicon
 *   - `*.<ext>`             : any file with a literal extension (robots.txt,
 *                             .svg, .png, etc.) — avoids bouncing static
 *                             assets through the auth check.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
