# Suplaykart — Phase 1 Final Report

**Date:** 2026-07-01 · **Status:** ✅ Phase 1 complete (1A–1N). 32 app routes, 30 automated tests, live Neon DB, all pushed to `origin/main`.

Phase 1 delivers a working hyperlocal q-commerce platform: a customer storefront (browse → cart → COD checkout → order tracking) and an in-app admin panel (catalog, inventory, orders, customers, settings), on the approved Clerk + Neon + Drizzle + Next.js 15 stack. Deferred by design (Phase 2): live payment gateways, multi-supplier onboarding, queues/async infra, WhatsApp OTP, maps/geocoding.

---

## 1. Architecture
- **Monorepo:** Turborepo + pnpm workspaces. Apps: `apps/web` (Next.js 15, App Router, React 19, RSC). Packages: `@suplaykart/db` (schema + DAL), `@suplaykart/ui` (design system), plus `core/auth/validators/config` seams.
- **Rendering:** Server Components for data, **Server Actions** for every mutation (Zod-validated), client components only for interactivity (cart controls, forms, admin actions).
- **DAL pattern:** every function takes `db` (dependency injection), is supplier/owner-scoped, returns typed display shapes. Composes into transactions via a shared `Executor` type.
- **Styling:** Tailwind v4 `@theme` tokens in `@suplaykart/ui`; framework-agnostic components (`linkComponent` prop). Mobile-first.
- **Build:** `output: "standalone"`; force-dynamic data routes; typecheck + build green across 3 packages.

## 2. Database (Neon Postgres + Drizzle)
- **Driver:** node-postgres (`pg`) — chosen over neon-http for **interactive transactions** (order/inventory lifecycles). Pooled endpoint, Node runtime.
- **Schema:** 24 tables, `casing: snake_case`, **money as integer paise**. Migrations `0000` (baseline, 23 tables) + `0001` (`admin_audit_log`), both applied to live Neon.
- **Seeded live:** 1 default supplier (multi-supplier seam), 12 categories, 18 products (+ variant + image), **18 inventory rows (900 units)**.
- **Key tables:** suppliers, users, categories, products, product_variants, inventory (+ inventory_movements ledger), carts/cart_items, addresses, orders/order_items/order_status_history, store_settings, admin_audit_log.

## 3. Auth (Clerk)
- Phone + SMS **OTP** (hosted portal); local `users` table mirrors Clerk via `clerk_user_id`. `getCurrentUser()` bridges the session → local row with **lazy upsert** (robust when webhooks can't reach localhost); `requireCurrentUser()` / `requireAdmin()` gate routes.
- **RBAC:** `role` (customer/support/ops/admin/owner). `requireAdmin` = staff-only; `promote` script grants roles. Middleware protects `/account/*`, `/cart`, `/checkout`, `/orders`, `/admin/*` (defense-in-depth with per-action re-checks).

## 4. Cart (1F)
- User-scoped, DB-persisted cart (`dal/cart.ts`): get/add(upsert-increment)/update(0⇒remove)/remove/clear + count + view (subtotal/savings). Server Actions + optimistic `CartControl` on every product card + PDP; live badge (0 for guests). Persists across logout/login (keyed by `users.id`).

## 5. Checkout (1G, COD only)
- `/checkout`: address picker (default preselected) + **Cash on Delivery / UPI on Delivery** + bill + `placeOrderAction` (Zod, rate-limited 8/min, domain-error messages). **No payment gateway.**

## 6. Orders + Inventory (1G/1H)
- **Transactional `createOrder`:** cart → validate address → bill → insert order (`placed`, `payment_status=pending`) → snapshot items → **reserve every line atomically (all-or-nothing)** → history → clear cart. Oversell impossible (conditional UPDATE; short line ⇒ full rollback).
- **State machine:** `placed→confirmed→packed→out_for_delivery→delivered` (+ `→cancelled` before dispatch). **delivered ⇒ commit sale + payment collected; cancelled ⇒ release stock.** Invalid transitions rejected.
- **Customer order area:** `/account/orders` (+ `/[id]`) — timeline, items, address, bill, in-window cancel. All ownership-enforced.

## 7. Admin (1I/1J, in-app `/admin`)
- **Foundation:** responsive shell + 8 sections (dashboard KPIs, orders, products, categories, inventory, customers, addresses, settings).
- **Operations:** product & category CRUD, **inventory adjustment** (guarded against dropping below reserved), **order status management** (reuses the tested machine), customer block/unblock, editable store settings. **Every mutation writes `admin_audit_log`** (actor-attributed); dashboard shows recent activity.

## 8. Security
- Middleware auth + `requireAdmin` RBAC; **ownership enforced in the DAL** (`WHERE user_id` / supplier scoping) on every read and mutation.
- Security headers (nosniff, `X-Frame-Options`, HSTS 2y, referrer-policy, permissions-policy), `X-Powered-By` removed.
- `robots.txt` disallows private areas; **rate limiting** on checkout; **structured JSON logging** on order placement + errors; Zod validation on all inputs; money in integer paise (no float drift); secrets gitignored (`.env.local`, `*.save`).

## 9. Testing
- **Vitest, 30 tests / 6 files, all passing** (`pnpm test`): unit (state machine, pricing, formatters) + DAL/flow suites over a **real Postgres engine (PGlite)** — cart, orders (reserve/oversell/deliver/cancel/ownership), addresses, admin ops (CRUD/adjust/status/block/settings/audit/stats).
- Standalone `verify:*` scripts retained for manual checks. Verification each phase: typecheck 3/3 + build + targeted tests.

## 10. Deployment readiness
- **Ready:** typecheck + build + tests green; live Neon migrated + seeded; standalone output; env via t3-env; health endpoints (`/api/health`, `/api/health/db`); SEO (metadata, OG, JSON-LD, robots, sitemap); security headers.
- **Before go-live:** set `NEXT_PUBLIC_SITE_URL` + production Clerk keys; configure the Clerk `user.created/updated` webhook to the deployed URL; delete the stray `apps/web/.env.local.save` and rotate the exposed dev secrets; promote an owner account (`promote` script).
- **Phase-2 upgrades:** payment gateway, shared-store rate limiting (Redis/Upstash), strict CSP, in-app OTP UI + onboarding, address map/serviceability, multi-supplier, notifications, Playwright E2E via Clerk testing tokens.

---

### Commit trail (Phase 1F–1N)
`145fedc` 1F cart · `677bf58` 1G checkout+orders · `a237591` 1H customer orders · `1438946` 1I admin foundation · `c602bbe` 1J admin ops · `88026e2` 1K hardening · `c33a4e5` 1L testing · `a081680` 1M visual QA · (this) 1 Final.
