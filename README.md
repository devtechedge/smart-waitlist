# Smart Waitlist & Referral Engine

A production-ready SaaS that turns your product launch into a viral growth loop. Users join the waitlist, receive a unique referral link, and climb the queue as their friends sign up. An admin dashboard surfaces live referral metrics and CSV export.

Built as a flagship full-stack reference for **Next.js 16 (App Router + Server Actions)**, **Supabase (Postgres + Auth + RLS)**, **Drizzle ORM**, **Tailwind CSS v4 + shadcn/ui**, and strict TypeScript.

---

## ✨ Features

| Area | Capabilities |
|------|--------------|
| **Auth** | Email/password sign-up & sign-in via Supabase Auth. Session cookies managed by `@supabase/ssr`. Route-protected via `src/middleware.ts`. |
| **Waitlist** | Each new signup is inserted into `waitlist_entries` with a monotonically assigned position. Position recomputes on referral events. |
| **Referrals** | Every user gets a stable `referral_code` → public link `/?ref=CODE`. Visits to `/?ref=CODE` cookie-stamp the visitor; on signup the referrer's `referral_count` increments and they leapfrog N positions. |
| **Dashboard** | Authenticated users see their current position, referral count, unique shareable link, and live leaderboard rank. |
| **Admin** | Email-allow-listed admins see every waitlist row with referral counts and last-seen timestamps. One-click CSV export via a Server Action (streamed). |
| **Security** | Row-Level Security on every table. Server Actions validate inputs with Zod. Service-role key NEVER reaches the browser. |
| **DX** | Strict TS, ESLint, Drizzle Studio, typed env access, no `any` types. |

---

## 🧱 Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 16** (App Router, RSC, Server Actions) | Edge-ready, Vercel-native, RSC streaming |
| Language | **TypeScript** (`strict: true`, zero `any`) | Type safety from DB → UI |
| Styling | **Tailwind CSS v4** + **shadcn/ui** | CSS-first config + accessible primitives |
| Database | **Supabase Postgres** | Managed Postgres with RLS |
| Auth | **Supabase Auth** + `@supabase/ssr` | Cookie-based, SSR-friendly |
| ORM | **Drizzle ORM** + `drizzle-kit` | Type-safe SQL, schema-as-code, zero overhead |
| Validation | **Zod** | Runtime + compile-time schema validation |
| Deployment | **Vercel** (Next.js) + **Supabase Cloud** (DB/Auth) | One-click deploy, generous free tier |

---

## 📁 Project Structure (Phase 1 → Phase 5)

```
smart-waitlist/
├── .env.example                  # All env vars (commit-safe)
├── drizzle.config.ts             # Drizzle Kit: schema path, dialect, dbCredentials
├── next.config.ts                # Next.js config (security headers, serverActions)
├── tailwind.config.ts            # shadcn/ui-compatible theme tokens
├── postcss.config.mjs            # @tailwindcss/postcss plugin
├── tsconfig.json                 # strict: true, @/* alias
├── eslint.config.mjs             # next/core-web-vitals + type-checked
├── package.json                  # scripts: dev/build/db:*/type-check
├── README.md                     # ← you are here
│
├── src/
│   ├── app/                      # App Router (Phase 4)
│   │   ├── layout.tsx           #   Root layout, fonts, metadata
│   │   ├── page.tsx             #   Landing page + referral capture
│   │   ├── globals.css          #   Tailwind v4 + design tokens
│   │   ├── dashboard/page.tsx   #   Auth-gated user dashboard
│   │   ├── admin/page.tsx       #   Admin-only waitlist table + CSV
│   │   ├── actions/             #   Server Actions (Phase 2)
│   │   │   ├── auth.ts
│   │   │   ├── waitlist.ts
│   │   │   └── admin.ts
│   │   └── api/                 #   Route handlers (if needed)
│   │
│   ├── db/                       # Drizzle schema + client (Phase 2)
│   │   ├── schema.ts            #   waitlist_entries, referrals, users
│   │   └── index.ts             #   Typed postgres + drizzle() client
│   │
│   ├── lib/                      # Shared utilities (Phase 2)
│   │   ├── env.ts               #   Typed, validated env access (Zod)
│   │   ├── supabase/
│   │   │   ├── client.ts        #   Browser client
│   │   │   ├── server.ts        #   Server Component client
│   │   │   ├── middleware.ts    #   Cookie refresh for middleware
│   │   │   └── admin.ts         #   Service-role client (server only)
│   │   └── utils.ts             #   cn(), formatters
│   │
│   ├── components/               # (Phase 3)
│   │   ├── ui/                  #   shadcn/ui primitives
│   │   ├── waitlist/            #   Signup form, position card, share box
│   │   └── admin/               #   Admin table, CSV button
│   │
│   └── middleware.ts             # Supabase auth refresh + route guard (Phase 5)
│
├── drizzle/                      # Generated migrations (committed)
│   └── 0000_initial.sql
│
└── vercel.json                   # Phase 5 deployment config (if needed)
```

---

## 🚀 Local Setup

### Prerequisites

- **Node.js ≥ 20.9.0** (Node 22+ recommended; we tested on Node 24)
- **npm ≥ 10**
- A free **[Supabase](https://supabase.com)** project

### 1. Install dependencies

```bash
cd smart-waitlist
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in values from your Supabase dashboard
(**Project Settings → API** and **Project Settings → Database**):

| Variable | Where to find it |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → Project API keys → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → Project API keys → `service_role` (**keep secret!**) |
| `DATABASE_URL` | Settings → Database → Connection string → URI (use the **pooler** URL on port `6543`) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for dev |
| `ADMIN_EMAILS` | Comma-separated list of admin emails (e.g. `you@example.com`) |
| `NEXT_PUBLIC_APP_NAME` | Optional display name |

### 3. Apply the database schema (Phase 2)

After Phase 2 ships the schema at `src/db/schema.ts`, push it to Supabase:

```bash
npm run db:push        # push schema directly (dev)
# — or —
npm run db:generate    # generate SQL migration under ./drizzle
npm run db:migrate     # apply migration
```

See [Database Setup](#-database-setup) below for full instructions including
RLS policies and triggers.

### 4. Run the dev server

```bash
npm run dev
```

Open **http://localhost:3000**.

### 5. Type-check & lint

```bash
npm run type-check
npm run lint
```

---

## 🔑 Environment Variable Reference

| Variable | Public? | Required | Purpose |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Yes | Browser + server Supabase client URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Yes | Browser-side anon key (RLS-protected) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Yes | Base URL for building referral links + OG metadata |
| `NEXT_PUBLIC_APP_NAME` | ✅ | No | Display name in UI / emails |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Yes | Server-only — bypasses RLS for admin ops |
| `DATABASE_URL` | ❌ | Yes | Drizzle ORM connection string |
| `ADMIN_EMAILS` | ❌ | No | Comma-separated allow-list for `/admin` access |

> **Security rule:** any variable prefixed with `NEXT_PUBLIC_` is inlined into
> the browser bundle. Never put secrets there. The `service_role` key and
> `DATABASE_URL` MUST stay server-only — they are accessed only inside
> Server Components, Server Actions, and Route Handlers.

---

## 🗄️ Database Setup

The canonical SQL schema (tables, enums, indices, RLS policies, triggers) lives
in [`supabase/migrations/0000_initial.sql`](./supabase/migrations/0000_initial.sql).
A Drizzle-generated migration is also available at
[`drizzle/0001_0000_initial.sql`](./drizzle/0001_0000_initial.sql).

### Option A: Drizzle Kit (recommended for dev)

```bash
# 1. Ensure DATABASE_URL is set in .env.local (see step 2 above).
# 2. Push the schema directly to Supabase:
npm run db:push

# 3. Apply RLS policies + triggers (Drizzle can't manage these).
#    Open the Supabase SQL Editor and paste the contents of:
#    supabase/migrations/0000_initial.sql
#    — but SKIP the "Tables" and "Enums" sections (already created by db:push).
#    Run only the "Triggers" and "Row Level Security" sections.
```

### Option B: Manual SQL (recommended for production)

```bash
# 1. Open the Supabase Dashboard → SQL Editor.
# 2. Paste the ENTIRE contents of supabase/migrations/0000_initial.sql.
# 3. Click "Run". The script is idempotent (uses if not exists / or replace).
```

This creates:
- `profiles` table (1:1 with `auth.users`, auto-populated by a trigger)
- `waitlist_entries` table (the core waitlist, with self-referential referral FK)
- `waitlist_status` enum (`pending` → `invited` → `activated`)
- Composite index on `(referral_count, created_at)` for fast position queries
- RLS policies (users can read/update only their own rows; anyone can insert)
- `updated_at` triggers on both tables
- `handle_new_user()` trigger that auto-creates a profile on auth signup

> **Admin operations** (listing all entries, CSV export) are performed from
> Server Actions using the **service-role** client, which bypasses RLS. The
> `ADMIN_EMAILS` env var gates which authenticated users may invoke those
> actions.

---

## ☁️ Deployment

### Vercel (frontend + serverless functions)

1. Push this repo to GitHub.
2. In Vercel, **New Project → Import** your repo.
3. Set the following environment variables in **Project Settings → Environment Variables**:

   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   NEXT_PUBLIC_APP_URL          # e.g. https://your-app.vercel.app
   NEXT_PUBLIC_APP_NAME
   SUPABASE_SERVICE_ROLE_KEY
   DATABASE_URL
   ADMIN_EMAILS
   ```

4. **Deploy.** Vercel auto-detects Next.js 16 — no `vercel.json` overrides needed
   for the default setup. (A `vercel.json` is included in Phase 5 only if custom
   rewrites/headers are required.)

### Supabase Cloud (database + auth)

1. Create a project at **https://supabase.com**.
2. Apply the schema via **SQL Editor** (see [Manual Schema Setup](#-manual-schema-setup-sql))
   or via `npm run db:push` from your local machine.
3. In **Authentication → Providers**, enable **Email**.
4. (Optional) In **Authentication → URL Configuration**, set the Site URL to your
   Vercel deployment and add `http://localhost:3000` to Redirect URLs for dev.

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fsmart-waitlist&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,DATABASE_URL,ADMIN_EMAILS,NEXT_PUBLIC_APP_URL&envDescription=Supabase%20project%20URL%2C%20anon%20key%2C%20service%20role%20key%2C%20database%20URL%2C%20admin%20emails%2C%20app%20URL&project-name=smart-waitlist&repository-name=smart-waitlist)

> **Before deploying:** Create a Supabase project first, apply the schema
> (see [Database Setup](#-database-setup)), and gather your env vars. The
> deploy button will prompt you to enter them. Update the `repository-url`
> in the button link to point to your fork.

---

## 📜 npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server (Turbopack-enabled in Next 16) |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run `tsc --noEmit` |
| `npm run db:generate` | Generate SQL migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply generated migrations to the database |
| `npm run db:push` | Push schema directly (skips migration files; dev only) |
| `npm run db:pull` | Introspect existing DB → regenerate `schema.ts` |
| `npm run db:studio` | Open Drizzle Studio GUI at https://local.studio.drizzle.team |
| `npm run db:check` | Check for schema drift between code and DB |

---

## 🛣️ Roadmap (Build Phases)

| Phase | Scope | Status |
|-------|-------|--------|
| **1. Initialization & Configuration** | Next.js scaffold, deps, configs, README | ✅ Complete |
| **2. Database, Auth & Server Actions** | Drizzle schema, Supabase clients, Zod validators, Server Actions | ✅ Complete |
| **3. UI & Component Architecture** | shadcn/ui init, custom waitlist/admin components | ✅ Complete |
| **4. App Router & Pages** | Landing, dashboard, admin pages, route handlers | ✅ Complete |
| **5. Middleware & Deployment** | Auth middleware, `vercel.json`, SQL migrations, final polish | ✅ Complete |

**All 5 phases complete.** The project is production-ready.

---

## 🔒 Security Notes

- **RLS is enabled on every table.** Anonymous users can only INSERT a waitlist
  entry for themselves. SELECT/UPDATE are scoped to the owner. See
  `supabase/migrations/0000_initial.sql` for the full policy set.
- **Service-role key** (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS and is used
  exclusively inside Server Actions gated by `ADMIN_EMAILS`. It is NEVER
  imported by any client component or `NEXT_PUBLIC_*` module. The
  `src/lib/supabase/admin.ts` file is guarded by `import "server-only"`.
- **Middleware auth refresh.** `src/middleware.ts` runs on every request,
  refreshes expired Supabase tokens via `getUser()`, and redirects
  unauthenticated users away from protected routes (`/dashboard`, `/admin`)
  before they hit the server-render pipeline.
- **Zod validation** runs at every Server Action boundary. Invalid payloads are
  rejected with a typed error before touching the DB.
- **Open-redirect protection.** Both the auth Server Actions and the
  `/auth/callback` route handler sanitize redirect targets via
  `safeRedirectPath()` — rejects scheme-prefixed URLs, backslashes, and
  non-root-relative paths.
- **Strict TypeScript** (`strict: true`, no `any`) catches type drift at build time.
- **Security headers** (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`,
  `Strict-Transport-Security` with preload) are set in both `next.config.ts`
  and `vercel.json` for defense in depth.

---

## 📝 License

MIT — free to use as a portfolio piece, fork for your own launch, or extend
into a full product.
