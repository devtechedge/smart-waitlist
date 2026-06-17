import { z } from "zod";

/**
 * Public environment variables
 * ----------------------------
 * These are exposed to the browser bundle via the `NEXT_PUBLIC_` prefix and
 * are therefore safe to import from Client Components.
 *
 * Validation runs LAZILY on first access (not at module load). This is
 * critical for `next build`: during the "collect page data" phase, Next.js
 * imports every route module, and `process.env.NEXT_PUBLIC_*` vars are NOT
 * inlined at build time (they're runtime vars). Eager validation would
 * cause the build to fail when env vars aren't present in the build
 * environment. Lazy validation defers the check to actual runtime use.
 *
 * This module must NOT import `"server-only"` — it is imported by both client
 * and server code. Server-only env vars live in `src/lib/server-env.ts`.
 */

const publicEnvSchema = z.object({
  /** Supabase project URL, e.g. https://your-project.supabase.co */
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),

  /** Supabase anon public key (safe to expose; RLS enforces security). */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY must not be empty"),

  /** Public app URL used to build absolute referral links + OG metadata. */
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),

  /** Optional display name shown in UI / emails. */
  NEXT_PUBLIC_APP_NAME: z.string().default("Smart Waitlist"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cachedPublicEnv: PublicEnv | null = null;

/**
 * Lazily parse and cache the public env.
 *
 * Throws a helpful error if any required variable is missing or malformed.
 * The error is thrown on first ACCESS (not at module import) so that
 * `next build` can complete even when runtime env vars aren't set in the
 * build environment.
 */
function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;

  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      [
        "❌  Invalid public environment variables.",
        "    The following problems were detected:",
        issues,
        "",
        "    Fix: copy .env.example to .env.local and fill in the values.",
        "    See README.md → “Local Setup” for full instructions.",
      ].join("\n"),
    );
  }

  cachedPublicEnv = result.data;
  return cachedPublicEnv;
}

/**
 * Lazy proxy — accessing `publicEnv.NEXT_PUBLIC_SUPABASE_URL` triggers
 * validation on first access, then caches the result. This lets the module
 * be imported at build time without failing.
 */
export const publicEnv: PublicEnv = new Proxy({} as PublicEnv, {
  get(_target, prop: string) {
    return getPublicEnv()[prop as keyof PublicEnv];
  },
});

/**
 * The URL origin (no trailing slash), useful for building absolute links.
 * Implemented as a function so it's evaluated lazily.
 *
 * Example: `${publicAppOrigin()}/?ref=ABC`
 */
export function publicAppOrigin(): string {
  return getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}
