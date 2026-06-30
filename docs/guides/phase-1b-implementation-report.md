# Phase 1B — Implementation Report (Authentication + Database Connectivity)

**Date:** 2026-06-30 · **Result:** code complete; **DB connectivity verified end-to-end against a real Postgres**; middleware partially validated (full redirect needs real Clerk keys); Neon/Clerk *provisioning* steps documented (no live credentials in this environment). No UI built.

## Key correction this phase

The DB driver was switched **from `neon-http` to `node-postgres` (pg)**. Reason:
the Phase-1 order/inventory lifecycles require **interactive transactions**
(reserve-all-or-fail), which `neon-http` does **not** support. `pg` is
transaction-capable, works against Neon's pooled endpoint on a Node runtime
(Vercel Fluid Compute), and runs against any standard Postgres locally —
enabling the real verification below.

## Objectives

| # | Objective | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Configure Neon Postgres | ⚠️ code-ready | Driver = `pg` against pooled `DATABASE_URL`; dev-safe pool singleton. **Live Neon needs your connection string** (steps below). |
| 2 | Run migrations on Neon | ✅ verified locally | `0000_*` migration applied to a real Postgres (PGlite): **23 tables, 10 enums**. Run on Neon: `pnpm db:migrate`. |
| 3 | Execute seed data | ✅ verified | `seedBaseline` created default supplier; **idempotent** (2nd run created nothing); coupons `WELCOME10`,`NAGORE40`; areas seeded. |
| 4 | Configure Clerk Phone OTP | ✅ code-complete | ClerkProvider + `clerkMiddleware`; **Clerk→DB webhook** `/api/webhooks/clerk` (verifies signature, upserts user). Phone+SMS OTP = Dashboard toggle. |
| 5 | Validate protected-route middleware | ⚠️ partial | Middleware active + bundled; public routes pass (200); **protected-redirect needs real Clerk keys** (placeholder keys 404 instead of redirecting). |
| 6 | Health-check endpoints | ✅ verified | `GET /api/health` → 200; `GET /api/health/db` → 200 (db up) / 503 (db down). |
| 7 | Database access layer | ✅ verified | `packages/db/src/dal/*` — health, users (upsert/get), store (supplier/serviceability); round-tripped against real PG. |
| 8 | Verify env variables | ✅ done | Typed contract in `apps/web/src/env.ts`; templates updated. See table below. |

## End-to-end DB verification (real Postgres, no Docker/Neon)

`pnpm --filter @suplaykart/db verify:db` spins up PGlite (WASM Postgres), runs the
committed migration, seeds, and exercises the DAL:

```json
{
  "migrations": "applied",
  "publicTables": 23,
  "enums": 10,
  "health": { "ok": true, "latencyMs": 0 },
  "defaultSupplier": "Suplaykart Store",
  "seedCreatedSupplier": true,
  "secondSeedCreatedSupplier": false,        // idempotent
  "isServiceable_611002": true,
  "isServiceable_999999": false,
  "upsertedUserId": "d733c616-…",
  "fetchedUserPhone": "+919487867816",       // Clerk→DB upsert round-trip
  "coupons": ["NAGORE40", "WELCOME10"]
}
```

> PGlite is used **only for verification** in this Docker-less environment.
> Production uses `pg` against Neon.

## Build / typecheck (Turbo)

```
pnpm typecheck → 2 successful, 2 total                                  (exit 0)
pnpm build     → ✓ compiled; routes:                                    (exit 0)
                 ƒ /api/health   ƒ /api/health/db   ƒ /api/webhooks/clerk
                 ƒ Middleware 87.8 kB
```

## Runtime checks (server up)

```
GET /api/health     → 200  {"status":"ok",...}      (public liveness)
GET /api/health/db  → 503  {"status":"error","db":"down"}  (readiness, DB unreachable)
GET /                → 200                            (public)
GET /admin /account → 404  (NOT redirected — see objective 5)
```

### Objective 5 — what's proven vs pending
- **Proven:** middleware compiles, bundles (`Compiled /middleware`), and runs on
  every request; public routes pass through (200); the protected set is
  `/account`, `/cart`, `/checkout`, `/orders`, `/wishlist`, `/admin` (standard
  Clerk v6 `auth.protect()` pattern).
- **Pending (needs real Clerk keys):** with placeholder keys Clerk cannot resolve
  a real instance to redirect to, so protected routes fall through to 404 instead
  of a sign-in redirect. **Validate with real keys:**
  `curl -sI https://<app>/admin` → expect `307` + `Location:` to Clerk sign-in.
- **Minor follow-up:** the compiled outer matcher is `^/.*$` (middleware runs on
  all paths incl. static); optimize `config.matcher` to skip `_next`/assets.

## Environment variables (objective 8)

| Variable | Scope | Required | Used by |
| --- | --- | --- | --- |
| `DATABASE_URL` | server | ✅ | DB client, migrate, seed, `/api/health/db` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | client | ✅ | ClerkProvider, middleware |
| `CLERK_SECRET_KEY` | server | ✅ | middleware, Clerk backend |
| `CLERK_WEBHOOK_SIGNING_SECRET` | server | for webhook | `/api/webhooks/clerk` |
| `DB_POOL_MAX` | server | optional | pg pool size (default 10) |
| `SKIP_ENV_VALIDATION` | server | optional | CI builds without secrets |

## To complete against live Neon + Clerk (needs your credentials)

```bash
# 1. Put real values in apps/web/.env.local (+ export DATABASE_URL for the CLI)
# 2. Apply schema + seed on Neon:
pnpm db:migrate
pnpm --filter @suplaykart/db seed
# 3. Verify readiness against Neon:
pnpm --filter web dev      # then: curl localhost:3000/api/health/db  → {"db":"up"}
# 4. Clerk Dashboard: enable Phone + SMS OTP; add webhook → /api/webhooks/clerk
#    (subscribe user.created, user.updated); set CLERK_WEBHOOK_SIGNING_SECRET
```

## Not done (as scoped)
No legacy migration, no storefront UI, no admin UI. Sign-in page (auth UI) is a
later phase; middleware + webhook + DAL are the connectivity layer.

## Git
Phase 1B changes are **uncommitted** in the working tree (16 files). Phase 1A
(`acc6382`) remains committed but **unpushed** (push blocked — `Allbeesolutions`
lacks write access to `Hajihaz4/Suplaykart-web`).
