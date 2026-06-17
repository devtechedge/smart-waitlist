import "server-only";
import { z } from "zod";

/**
 * Server-only environment variables
 * ---------------------------------
 * These variables contain secrets (service-role key, database URL) and MUST
 * never be inlined into the browser bundle. The `"server-only"` import at the
 * top of this file causes a build-time error if any Client Component tries to
 * import from it.
 *
 * Validation runs lazily on the first call to `getServerEnv()` so that:
 *   - Production builds don't fail when preview env vars are missing.
 *   - The error message surfaces only when the server actually needs the var.
 */

const serverEnvSchema = z.object({
  /**
   * Supabase service-role key. Bypasses RLS.
   * Used only in admin Server Actions and the admin Supabase client.
   */
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY must not be empty"),

  /**
   * Direct Postgres connection string for Drizzle ORM.
   * Use the Supabase pooler URL (port 6543) for serverless compatibility.
   */
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL must not be empty")
    .startsWith("postgres", "DATABASE_URL must start with postgresql:// or postgres://"),

  /**
   * Comma-separated allow-list of admin emails.
   * Example: "admin@example.com,founder@example.com"
   * Empty string means no admins (admin routes will 403).
   */
  ADMIN_EMAILS: z.string().default(""),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

/**
 * Lazily parse and cache the server env.
 *
 * Throws a helpful error if any required variable is missing or malformed.
 * The error is intentionally thrown on first call rather than at module load
 * so that build-time optimization passes don't trigger false-positive failures.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const result = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      [
        "❌  Invalid server environment variables.",
        "    The following problems were detected:",
        issues,
        "",
        "    Fix: ensure the variable is set in your deployment environment",
        "    (e.g. Vercel Project Settings → Environment Variables) or in",
        "    your local .env.local file. See README.md for the full list.",
      ].join("\n"),
    );
  }

  cachedServerEnv = result.data;
  return cachedServerEnv;
}

/**
 * Returns true if the given email is on the ADMIN_EMAILS allow-list.
 * Comparison is case-insensitive after trimming whitespace.
 *
 * Example:
 *   ADMIN_EMAILS="admin@example.com, founder@example.com"
 *   isAdminEmail("Founder@Example.com") // → true
 */
export function isAdminEmail(email: string): boolean {
  const { ADMIN_EMAILS } = getServerEnv();
  if (!ADMIN_EMAILS.trim()) return false;

  const allowList = ADMIN_EMAILS.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return allowList.includes(email.trim().toLowerCase());
}
