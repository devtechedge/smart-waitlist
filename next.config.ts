import type { NextConfig } from "next";

/**
 * Next.js Configuration
 * ---------------------
 * - `reactStrictMode`   → catches side-effect bugs in dev.
 * - `poweredByHeader`   → hides the `X-Powered-By: Next.js` header (security hygiene).
 * - Type errors fail the build (`ignoreBuildErrors: false`).
 * - Vercel must not use `output: "standalone"`.
 *
 * Vercel handles Next.js automatically. Required env: see `.env.example`.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
