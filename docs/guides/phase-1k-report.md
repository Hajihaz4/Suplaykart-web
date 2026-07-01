# Phase 1K — Production Hardening

**Date:** 2026-07-01 · **Scope:** SEO/OG/structured data, robots + sitemap, security headers, rate limiting, structured logging, error/loading/empty states.
**Result:** ✅ all items shipped and runtime-verified. typecheck 3/3, build green.

## SEO / metadata / structured data
- Root layout: `metadataBase`, title template (`%s · Suplaykart`), description, OpenGraph, Twitter card, robots index/follow. Config in `lib/site.ts` (`NEXT_PUBLIC_SITE_URL` override).
- PDP: `generateMetadata` (title/description/canonical/OG per product) + **Product JSON-LD** (name, brand, INR offer, availability).
- Home: **Organization JSON-LD**.
- `app/robots.ts` — allow public, disallow `/admin /account /cart /checkout /api`; sitemap + host.
- `app/sitemap.ts` — home/categories/search + category searches + **all active product URLs from the DB** (revalidate 1h; falls back to static core if DB down).

## Security headers (`next.config.ts`)
`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` (2y, preload), `Permissions-Policy` (camera/mic off, geo self), `X-DNS-Prefetch-Control: on`, and `poweredByHeader: false` (removes `X-Powered-By`).

## Rate limiting + logging
- `lib/rate-limit.ts` — in-memory fixed-window limiter (Phase-2: swap for Upstash/Redis). Applied to checkout: **8 order attempts / 60s per user**.
- `lib/logger.ts` — structured JSON logger (level/timestamp/context). Wired into order placement (`order.placed` / `order.oversell_blocked` / `order.place_failed`) and the global error boundary.

## Error / loading / empty states
- `global-error.tsx` (root fallback, self-contained + logs), `admin/error.tsx`, `admin/loading.tsx`, `checkout/loading.tsx` — on top of the per-route `loading.tsx` / `not-found.tsx` / `error.tsx` and `EmptyState` usage added across 1D–1J.

## Verification (dev, curl)
```
pnpm typecheck → 3/3 ; pnpm build → robots.txt + sitemap.xml routes, exit 0
GET /              → X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
                     Strict-Transport-Security, Permissions-Policy present;
                     no X-Powered-By
GET /robots.txt    → disallows admin/account/cart/checkout/api + sitemap + host
GET /products/…    → <script type="application/ld+json"> Product present
GET /sitemap.xml   → valid urlset with home/categories + live product URLs
```

## Phase-2 notes
Rate limiting is per-instance (in-memory) — move to a shared store for horizontal scaling. Consider a strict CSP (needs Clerk/Next nonce wiring).
