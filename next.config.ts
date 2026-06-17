import type { NextConfig } from "next";

/**
 * Next.js Configuration
 * ---------------------
 * - `reactStrictMode`   → catches side-effect bugs in dev.
 * - `poweredByHeader`   → hides the `X-Powered-By: Next.js` header (security hygiene).
 * - `experimental.serverActions` is enabled by default in Next 14+ App Router.
 * - Supabase Auth uses cookies; we relax `cacheControl` so authenticated
 *   Server Components aren't cached behind a logged-out snapshot.
 *
 * Vercel handles Next.js automatically — no special build config required.
 * If you deploy to Netlify or Railway, set `NEXT_PUBLIC_SUPABASE_URL`,
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `DATABASE_URL` in the project env vars.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow large CSV exports through Server Actions without hitting the 1MB
  // default body size limit. 4MB comfortably covers ~50k waitlist rows.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // Always render fresh on auth-gated routes — RLS-safe.
  // (Route-segment `revalidate = 0` is also used inside protected pages.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
