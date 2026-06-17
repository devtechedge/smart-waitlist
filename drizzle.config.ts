import { defineConfig } from "drizzle-kit";
import { env } from "process";

/**
 * Drizzle Kit Configuration
 * --------------------------
 * - `db:push`    → push schema directly to the database (fast iteration in dev)
 * - `db:generate`→ generate SQL migration files under ./drizzle
 * - `db:migrate` → apply generated migrations
 * - `db:studio`  → open Drizzle Studio (GUI) at https://local.studio.drizzle.team
 * - `db:pull`    → introspect an existing DB and update the schema file
 *
 * The connection string is sourced from `DATABASE_URL` (see `.env.example`).
 * Drizzle Kit loads `.env.local` automatically when run via `npm run`.
 */

const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
  // Fail loudly at config-load time so the developer sees the exact fix.
  throw new Error(
    [
      "❌  DATABASE_URL is not set.",
      "   Drizzle Kit cannot connect to your Supabase Postgres database.",
      "",
      "   Fix:",
      "     1. cp .env.example .env.local",
      "     2. Fill in DATABASE_URL with your Supabase connection string",
      "        (Dashboard → Settings → Database → Connection string → URI)",
      "",
      "   See README.md → “Local Setup” for full instructions.",
    ].join("\n"),
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
  casing: "snake_case",
});
