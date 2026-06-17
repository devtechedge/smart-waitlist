import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import { getServerEnv } from "@/lib/server-env";

/**
 * Drizzle ORM client (server-only)
 * --------------------------------
 * Uses `postgres` (postgres-js) as the underlying driver, configured for
 * Supabase's PgBouncer pooler (port 6543, transaction mode). Prepared
 * statements are disabled (`prepare: false`) because PgBouncer transaction
 * mode does not support them.
 *
 * The client is cached on `globalThis` to survive Next.js dev hot-reloads
 * (otherwise every reload would spawn a new connection pool and exhaust
 * Supabase's free-tier connection limit).
 *
 * LAZY INITIALIZATION: The `db` export is a Proxy that defers client
 * creation until first property access. This is critical for `next build`:
 * during the "collect page data" phase, Next.js imports every route module
 * to inspect its configuration, and server-only env vars (DATABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY) are NOT available at build time. Eager
 * initialization would cause the build to fail. Lazy init defers the env
 * check to actual runtime use.
 */

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
type PostgresClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as typeof globalThis & {
  __smartWaitlistDrizzleClient?: PostgresClient;
  __smartWaitlistDrizzleDb?: DrizzleDb;
};

function createPostgresClient(): PostgresClient {
  const { DATABASE_URL } = getServerEnv();

  return postgres(DATABASE_URL, {
    // Disable prepared statements — required for Supabase's pooler.
    prepare: false,
    // Small pool size — serverless functions share a process per instance.
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

function createDrizzleDb(): DrizzleDb {
  const client =
    globalForDb.__smartWaitlistDrizzleClient ?? createPostgresClient();

  const db =
    globalForDb.__smartWaitlistDrizzleDb ??
    drizzle({ client, schema, logger: process.env.DRIZZLE_LOG === "true" });

  // Cache on globalThis in non-production so HMR doesn't leak connections.
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__smartWaitlistDrizzleClient = client;
    globalForDb.__smartWaitlistDrizzleDb = db;
  }

  return db;
}

let cachedDb: DrizzleDb | null = null;

/** Lazily create + cache the Drizzle instance. */
function getDb(): DrizzleDb {
  if (cachedDb) return cachedDb;
  cachedDb = createDrizzleDb();
  return cachedDb;
}

/**
 * Singleton Drizzle instance (lazy Proxy).
 *
 * Accessing any property (e.g. `db.query`, `db.select()`) triggers
 * initialization on first use, then caches the result. This lets the
 * module be imported at build time without requiring DATABASE_URL to be
 * present in the build environment.
 *
 * @example
 *   import { db, schema } from "@/db";
 *   const entry = await db.query.waitlistEntries.findFirst({
 *     where: eq(schema.waitlistEntries.email, email),
 *   });
 */
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop: string | symbol) {
    const realDb = getDb();
    const value = Reflect.get(realDb, prop);
    // Bind methods so `this` is preserved when destructured.
    return typeof value === "function" ? value.bind(realDb) : value;
  },
});

/** Re-export the full schema namespace for convenient `import { schema }`. */
export { schema };

/** Re-export Drizzle inferred types so consumers can do `import { WaitlistEntry } from "@/db"`. */
export type {
  Profile,
  NewProfile,
  WaitlistEntry,
  NewWaitlistEntry,
  WaitlistStatus,
} from "./schema";

/** The Drizzle DB type — useful for typing function parameters. */
export type Database = DrizzleDb;
