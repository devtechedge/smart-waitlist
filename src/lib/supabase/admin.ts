import "server-only";
import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/public-env";
import { getServerEnv } from "@/lib/server-env";

/**
 * Supabase admin client (service-role)
 * ------------------------------------
 * Constructs a Supabase client using the `service_role` key, which bypasses
 * Row-Level Security entirely. Use this ONLY in trusted server contexts
 * (admin Server Actions, admin Route Handlers, background jobs).
 *
 * NEVER expose the service-role key to the browser — it can read/modify any
 * row in your database, ignoring all RLS policies.
 *
 * This module is guarded by `"server-only"` so that any accidental import
 * from a Client Component fails at build time.
 *
 * @example
 *   import { createSupabaseAdminClient } from "@/lib/supabase/admin";
 *   const admin = createSupabaseAdminClient();
 *   await admin.auth.admin.listUsers();
 */

let cachedAdmin: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient(): ReturnType<typeof createClient> {
  if (cachedAdmin) return cachedAdmin;

  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  cachedAdmin = createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // We never want this client to auto-refresh or persist a session —
        // it's a machine-to-machine client using the service-role key.
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return cachedAdmin;
}

/** The Supabase admin client type — exported for convenience typing. */
export type SupabaseAdminClient = ReturnType<typeof createClient>;
