import "server-only";
import { z } from "zod";

import { isEmailOnAllowList, parseAdminAllowList } from "@/lib/admin-allowlist";

/**
 * Server-only environment variables
 * ---------------------------------
 * These variables contain secrets (service-role key, database URL) and MUST
 * never be inlined into the browser bundle. The `"server-only"` import at the
 * top of this file causes a build-time error if any Client Component tries to
 * import from it.
 */

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY must not be empty"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL must not be empty")
    .startsWith("postgres", "DATABASE_URL must start with postgresql:// or postgres://"),

  ADMIN_EMAILS: z.string().default(""),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

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
 */
export function isAdminEmail(email: string): boolean {
  const { ADMIN_EMAILS } = getServerEnv();
  return isEmailOnAllowList(email, parseAdminAllowList(ADMIN_EMAILS));
}
