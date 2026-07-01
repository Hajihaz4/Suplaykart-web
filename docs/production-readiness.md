# Suplaykart — Production Readiness

**Date:** 2026-07-01 · **Assessment:** ✅ **READY for a Phase-1 (COD) launch** after the go-live checklist below. No code blockers remain; the open items are configuration and one brand-color decision.

## Readiness scorecard

| Area | Status | Notes |
|------|--------|-------|
| Build & types | ✅ | `pnpm build` (32 routes) + `typecheck` 3/3, no unused |
| Automated tests | ✅ | 33 Vitest (cart / orders / inventory / address / admin) |
| Database | ✅ | Neon migrated (`0000`+`0001`) + seeded; 18 variants × 50 stock |
| Auth & RBAC | ✅ | Clerk OTP; `requireAdmin`; middleware-gated private routes |
| Core commerce | ✅ | cart → COD checkout → oversell-safe transactional orders → tracking |
| Admin | ✅ | catalog/inventory/orders/customers/settings + audit log |
| Console health | ✅ | no hydration/errors (post-audit); only Clerk dev-key note in dev |
| Accessibility | ✅ mostly | AA met after fixes; one brand near-miss (A1) is a design call |
| Responsiveness | ✅ | 0 overflow at 390px; reflows to desktop |
| SEO | ✅ | metadata, OpenGraph, JSON-LD, robots, sitemap |
| Security headers | ✅ | nosniff, X-Frame-Options, HSTS, referrer/permissions-policy |
| Performance | ✅ (proxy) | First Load 102 kB; run Lighthouse on prod for a formal score |
| Rate limiting | ⚠️ | in-memory (per-instance); fine single-instance, Redis for scale |
| Observability | ⚠️ | structured JSON logs; no external log sink/error tracker yet |

## Go-live checklist (blocking)
1. **Clerk production keys** — set `CLERK_*` prod keys; configure the `user.created/updated` webhook to the deployed URL (removes the dev-key warning; enables server-side user sync).
2. **`NEXT_PUBLIC_SITE_URL`** — set to the real domain (drives canonical/OG/sitemap URLs).
3. **Delete `apps/web/.env.local.save`** and **rotate** the exposed dev Neon password + Clerk secret.
4. **Promote an owner** — `pnpm --filter @suplaykart/db exec tsx scripts/promote-admin.ts "user_…" owner`.
5. **`DATABASE_URL`** — production pooled Neon string in the host's env.

## Recommended before/shortly after launch (non-blocking)
- Decide brand-contrast item **A1** (darken brand ~5% or use `text-brand-dark` on chips).
- Add an error tracker (Sentry) + ship logs to a sink.
- Move rate limiting to a shared store (Upstash/Redis) when scaling beyond one instance.
- Run **Lighthouse** against the deployed build; budget for LCP/CLS.
- Consolidate the duplicate `@theme` tokens (**C1**).

## Phase-2 scope (not required for launch)
Payment gateway · in-app OTP + onboarding · address map/serviceability · strict CSP · multi-supplier · notifications · wishlist/coupons/ratings · Playwright E2E via Clerk testing tokens.

## Bottom line
The platform is **functionally complete and stable for a Phase-1 COD launch**. Ship after the 5-item go-live checklist; the remaining items are enhancements and one brand decision.
