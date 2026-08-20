# Security Assessment — Smart Waitlist & Referral Engine

**Date:** 2026-08-21  
**Scope:** Auth, RLS, XSS, injection, Stripe webhooks, CORS, secrets, admin allow-list  
**Context:** Public deploy is a **real full-stack app** (Vercel + Supabase Auth/Postgres + optional Stripe). This is not a client-only demo.

---

## Executive summary

| Area | Risk | Notes |
|------|------|--------|
| Authentication | **Low** | Supabase Auth (email/password + optional GitHub OAuth). Session cookies refreshed in middleware. |
| Authorization | **Low** | `/dashboard` and `/admin` gated by middleware. Admin mutations also call `requireAdmin()` against `ADMIN_EMAILS`. |
| RLS | **Low** | Postgres RLS on waitlist/profile tables. Service-role key is server-only. |
| XSS | **Low** | One `dangerouslySetInnerHTML` in shadcn `chart.tsx` (Recharts CSS vars, not user HTML). React text escaping elsewhere. |
| Injection | **Low** | Drizzle parameterized queries. Zod on Server Actions. Referral codes allow-listed to `[a-z0-9]`. |
| Open redirects | **Low** | `safeRedirectPath()` rejects schemes, `//`, and backslashes. |
| Stripe | **Low if configured** | Webhook signature verified. Checkout metadata is not trusted without the signed event. Demo mode skips Stripe if keys are empty. |
| Secrets in repo | **Low** | `.env*` gitignored; `.env.example` has placeholders only. |
| CORS | **N/A** | Same-origin App Router; no public Socket.io/API CORS surface. |
| Build config | **Hardened** | `ignoreBuildErrors` is **false**. Type errors fail CI/build. |

**Overall (production):** Residual risk is typical of a small SaaS waitlist: keep service-role and Stripe secrets off the client, keep `ADMIN_EMAILS` tight, and do not expose the Supabase service role in `NEXT_PUBLIC_*`.

---

## 1. Authentication & session

**Findings**
- Email/password via Supabase Auth. Passwords must be ≥8 chars with upper, lower, and a digit (`src/lib/auth-validation.ts`).
- Middleware (`src/lib/supabase/middleware.ts`) refreshes the session with `getUser()` (not `getSession()`).
- Unauthenticated visitors hitting `/dashboard` or `/admin` are redirected home.
- Sign-in failures return a generic “Incorrect email or password.” (no user enumeration).

**Not NextAuth.** Do not claim NextAuth; this stack is `@supabase/ssr`.

---

## 2. Authorization

**Admin**
- Allow-list: `ADMIN_EMAILS` (comma-separated, case-insensitive). Empty list ⇒ no admins.
- `requireAdmin()` runs on admin Server Actions (CSV export, CRUD, promo codes) **in addition to** the page-level check. Middleware is not sufficient by itself.

**Self-referral**
- A user cannot credit themselves (`isSelfReferral`).

---

## 3. Injection / XSS

**SQL** — Drizzle ORM; no string-concatenated SQL on the hot path.

**Referral codes** — `normalizeReferralCode` rejects anything that is not `[a-z0-9]{1,32}`.

**XSS**
- Code search found `dangerouslySetInnerHTML` only in `src/components/ui/chart.tsx` (theme CSS, not waitlist content).
- Leaderboard names and emails render as React text (emails are masked in public views).

---

## 4. Payments & webhooks

- Stripe Checkout + Customer Portal + `/api/webhooks/stripe`.
- Signature verified with `STRIPE_WEBHOOK_SECRET`. Unsigned bodies are rejected.
- If `STRIPE_SECRET_KEY` is unset, checkout returns null and the UI can fall back to demo upgrades. Document that demo mode must **not** be left on in a real launch.

---

## 5. Secrets & config

| Variable | Client? | Notes |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Yes | Anon key is expected; RLS is the control. |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Bypasses RLS. Server-only. |
| `DATABASE_URL` | **No** | Direct Postgres. |
| `ADMIN_EMAILS` | **No** | Allow-list. |
| `STRIPE_*` / `RESEND_API_KEY` | **No** | Optional. |

`.gitignore` excludes `.env*`. Never commit real keys.

---

## 6. HTTP surface

| Path | Auth | Notes |
|------|------|--------|
| `/` | Public | Landing + signup. Degrades if DB is down. |
| `/signin`, `/signup` | Public | Redirects away if already signed in. |
| `/dashboard` | Session | Waitlist position, referral link. |
| `/admin` | Session **and** allow-list | Analytics, CSV, bans. |
| `/api/webhooks/stripe` | Stripe signature | No cookie auth. |
| `/api/og` | Public | Referral OG image from public profile fields. |

Security headers (frame deny, nosniff, referrer, permissions-policy, HSTS on Vercel) are set in `next.config.ts` / `vercel.json`. `X-Powered-By` is off.

---

## 7. Fraud heuristics (not a WAF)

`assessSignupFraud` scores temp-mail, IP/fingerprint velocity, plus-addressing, and referral farming. Scores ≥ 70 are flagged. This is transparent heuristics, not ML, and is **not** a substitute for rate limiting at the edge.

---

## 8. Dependency audit (2026-08-21)

- **Done:** Next `16.2.9` → `16.3.1` (PostCSS XSS / source-map advisories).
- **Done:** Removed `@vercel/og` (sharp/libvips CVEs). OG images use `next/og`.

Dependabot still ignores *unrelated* majors (eslint 10, recharts 3, lucide 1, typescript 7) that have broken preview deploys on other repos.

---

## 9. How to re-test

```bash
npm ci
npm test
npm run typecheck
npm run test:e2e
npm audit --omit=dev
```
