import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/public-env";

/**
 * Supabase browser client
 * ------------------------
 * Use this in Client Components and `"use client"` modules. It reads the
 * auth session from cookies (managed by `@supabase/ssr`) so the user stays
 * logged in across client-side navigation and Server Component refreshes.
 *
 * @example
 *   "use client";
 *   import { createSupabaseBrowserClient } from "@/lib/supabase/client";
 *   const supabase = createSupabaseBrowserClient();
 *   await supabase.auth.signOut();
 *
 * NOTE: There is intentionally no `"use client"` directive at the top of this
 * file — it's a factory function that returns a client. The client itself is
 * only constructed when called from client code. This lets server code import
 * the factory for type-inference purposes without dragging the browser bundle.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** The Supabase browser client type — exported for convenience typing. */
export type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;
