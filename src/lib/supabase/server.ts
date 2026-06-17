import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/public-env";

/**
 * Supabase server client
 * ----------------------
 * Use this in:
 *   - Server Components (RSC)
 *   - Server Actions (`"use server"`)
 *   - Route Handlers (`app/api/.../route.ts`)
 *
 * It reads the auth session from the cookie jar via Next.js's `cookies()`
 * (async in Next.js 15+) and writes refreshed session cookies back through
 * the same jar.
 *
 * @example
 *   import { createSupabaseServerClient } from "@/lib/supabase/server";
 *   const supabase = await createSupabaseServerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 * NOTE on `setAll` swallowing errors: when this client is constructed inside
 * a Server Component (read-only context), calling `cookies().set()` throws.
 * We swallow that error because session refresh is also handled by the
 * middleware (see `src/lib/supabase/middleware.ts`), so a missed refresh in
 * RSC is harmless.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
            // See: https://supabase.com/docs/guides/auth/server-side/nextjs
          }
        },
      },
    },
  );
}

/** The Supabase server client type — exported for convenience typing. */
export type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;
