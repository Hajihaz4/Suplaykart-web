# Phase 2L — Production Hardening

A review pass across authorization, rate-limiting, audit, input validation,
error handling, accessibility, and security headers. Findings and the fixes
applied.

## Authorization — ✅ verified, no gaps

Every mutating server action guards with the correct identity before touching
data:

- **Admin actions** (`admin/actions.ts`, `admin/mutations.ts`,
  `admin/notifications`, `admin/serviceability`, `admin/products/[id]/images`)
  → `requireAdmin()`.
- **Customer actions** (`account/*`, `cart`, `checkout`, `onboarding`)
  → `requireCurrentUser()`.
- **Telemetry actions** (`products/[slug]/recordViewAction`,
  `search/recordSearchAction`) write only to the caller's own cookie
  (bounded, input-validated) — no auth needed, no DB writes.
- **Defense in depth**: `middleware.ts` gates the same route groups at the
  edge; DAL functions are supplier/owner-scoped and re-check ownership. A
  server action never trusts a client-supplied owner id.

## Rate limiting — ⚠️ extended (was checkout-only)

`lib/rate-limit.ts` is an in-memory fixed-window limiter. It previously
guarded only checkout. This pass:

- **Hardened the limiter**: added a throttled `sweep()` (once/min) so the
  bucket map can't grow unbounded under many distinct per-IP keys, and a
  `clientKey(headers)` helper (left-most `x-forwarded-for` hop).
- **Extended coverage** to every abuse-prone or cost-bearing entry point:

  | Entry point | Key | Limit |
  | --- | --- | --- |
  | `GET /api/search/suggest` (public DB read) | client IP | 40 / min → `429` |
  | `reverseGeocodeAction` (paid geocoder) | user | 30 / min |
  | `subscribePushAction` | user | 20 / min |
  | `sendBroadcastAction` (fan-out to all customers) | admin | 6 / min |
  | `placeOrderAction` (pre-existing) | user | 8 / min |

  Single-instance correct; best-effort per-instance on multi-instance
  serverless. The interface is the swap-point for a shared Upstash/Redis store
  when horizontal scaling lands (one file).

## Audit logging — ⚠️ closed a gap

Admin mutations write to `admin_audit_log` via `writeAudit`. Coverage was
complete for product/category/inventory/order/serviceability/broadcast, but
**product image mutations were unaudited**. Added audit entries for
`product.image.add`, `product.image.delete`, and `product.image.set_primary`.
(High-frequency drag-reorder is intentionally left unaudited to avoid noise.)

## Input validation — ⚠️ closed a gap

- **Cart quantity was unbounded** at the action boundary. Checkout already
  enforces stock (`OutOfStockError`), so it was not exploitable for
  over-purchase, but a client could POST an absurd or negative quantity
  (the latter decrementing via `quantity + qty`). Added `clampQty()` →
  whole number in `[1, 99]`, and a UUID guard on `variantId` in the cart
  actions so malformed ids no-op instead of throwing a Postgres cast error.
- **Addresses / checkout / admin** already validate with zod schemas
  (`z.object(...).safeParse`) and return friendly field errors.

## Error handling — ✅ verified

Error boundaries in place: root `error.tsx` + `global-error.tsx`,
`admin/error.tsx`, and `not-found.tsx` at root plus product / address / order
detail routes. The public suggest API and geocoder swallow errors and degrade
to empty results rather than surfacing a 500.

## Security headers — ✅ verified

`next.config.ts` sets `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy`, HSTS (2y, preload), and a restrictive `Permissions-Policy`;
`poweredByHeader` is off. A full `Content-Security-Policy` is deferred — a
correct nonce-based CSP with Clerk + Next inline scripts is a production task
that needs staging verification, not a blind add.

## Accessibility — ✅ (Phase-1 audit carried forward)

The Phase-1 a11y audit (labelled controls, focus states, semantic landmarks,
keyboard nav, `aria-*` on interactive widgets) still holds; Phase-2 UI
(analytics, notifications, serviceability, image manager) reuses the same
audited `@suplaykart/ui` primitives.

## Follow-ups (non-blocking)

- Nonce-based CSP, verified on staging.
- Shared-store rate limiter (Upstash) if/when the app scales horizontally.
- A web-side test harness would let us unit-test `lib/rate-limit.ts`
  directly (it imports `server-only`, so it can't run under the current
  package-only Vitest setup).
