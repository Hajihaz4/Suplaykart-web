# ADR 0001 — Platform Architecture & Phase 1 Scope

- **Status:** Accepted
- **Date:** 2026-06-30
- **Deciders:** Owner (Hajihaz), Claude

## Context

Suplaykart is a greenfield web e-commerce / supply platform. A recommended
production architecture was produced via independent multi-architect review and
presented for approval. The owner **approved the architecture** with the six
modifications recorded below. No application code or Next.js scaffolding exists
yet; this ADR captures the agreed baseline so future work stays aligned.

## Decision

### Approved architecture baseline

| Area              | Choice                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| Repo              | Turborepo + pnpm workspaces (single monorepo)                          |
| App               | One Next.js 15 app (App Router, React 19, TypeScript strict)           |
| Admin             | **Inside the same app under `/admin`** (no separate deployment)        |
| Backend           | Modular monolith — framework-agnostic domain logic in `packages/core`  |
| Auth              | **Clerk** — phone number + SMS OTP (WhatsApp OTP deferred to Phase 2)   |
| Database          | PostgreSQL on Neon + Drizzle ORM                                       |
| UI                | Tailwind CSS + shadcn/ui                                                |
| Hosting           | Vercel                                                                  |

### Approved modifications (override the original proposal)

1. **Single-tenant** Suplaykart platform to start.
2. **Database is designed for future multi-supplier expansion, but supplier
   management is NOT implemented now** — schema-ready, feature-deferred.
3. **Admin panel stays inside the same Next.js app under `/admin`.** The
   previously proposed "trigger-gated split into a separate admin app" is
   deferred indefinitely until a concrete need arises.
4. **Phase 1 excludes:** Stripe, Stripe Connect, Redis, pg-boss, Inngest,
   queues, and any advanced infrastructure.
5. **Phase 1 focus (in scope):** customer storefront, admin dashboard, products,
   categories, cart, **checkout UI**, orders, users, inventory.
6. **`old-html/` migration begins only after the owner uploads all legacy
   pages.**

### Database multi-supplier readiness (designed, not built)

To satisfy modification #2 — keep future supplier expansion additive and
non-destructive — without building any supplier features now:

- Introduce a forward-compatible ownership seam (e.g. a single default
  seller/supplier the catalog, inventory, and orders reference) so that adding
  real suppliers later is an additive migration, not a rewrite.
- Do **not** hardcode single-seller assumptions that would force a destructive
  migration later.
- Keep product, pricing, inventory, and order tables capable of being scoped by
  a supplier in the future.
- Do **not** build supplier onboarding, supplier auth, payouts, commissions, or
  any supplier-scoped UI now.

### Checkout in Phase 1

"Checkout UI" is in scope; **live payment processing (Stripe et al.) is out.**
Checkout collects order details and creates orders without a payment gateway in
Phase 1 (e.g. a pending/manual-payment order status or a stubbed payment step).
Exact placeholder behavior to be confirmed when that screen is built.

## Consequences

- Faster Phase-1 delivery, fewer vendors and secrets to manage.
- Payments, supplier management, and async infrastructure are deferred but
  explicitly designed-for, so they slot in later without re-platforming.
- The database schema must be reviewed for forward-compatibility **before** any
  code is written (design-first).

## Still out of scope right now

- No application code generated yet.
- No Next.js scaffolding yet (pending explicit go-ahead from the owner).
