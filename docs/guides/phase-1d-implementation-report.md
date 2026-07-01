# Phase 1D — Implementation Report (Real Data Integration)

**Date:** 2026-07-01 · **Scope:** replace mock data with **live Neon/Postgres** via the Drizzle DAL. **No checkout, payments, order placement, inventory reservation, or admin** — read paths only.
**Result:** ✅ four read routes now render live data; typecheck + build green; verified visually against seeded Neon.

---

## 1. Executive summary
The storefront's four read routes (`/`, `/categories`, `/products/[slug]`, `/search`) were migrated from `mock-data.ts` to **live Neon** through new DAL functions that map the normalized schema (products + variants + categories + images) into the UI's display shapes. The catalog seed was expanded to **12 categories + 18 products** (with default variants + images) so the store shows realistic content. Loading skeletons, error boundaries, and empty states were added. `/cart` and `/account` intentionally remain on mock data (no checkout this phase).

## 2. DAL functions created (Step 2)
New/organized under `packages/db/src/dal/`:

| File | Functions |
| --- | --- |
| `suppliers.ts` | `getDefaultSupplier` (moved here), `requireDefaultSupplier` |
| `store.ts` | `getServiceableArea`, `isServiceable` (supplier query moved out) |
| `catalog.ts` | `listCategories` · `getCategoryBySlug` · `listFeaturedProducts` (by review count) · `listNewArrivals` (by createdAt) · `listProductsByCategory` · `searchProducts` (name/brand/category ILIKE) · `getProductDetailBySlug` (+ variants + images) |
| `types.ts` | `CategorySummary` · `ProductSummary` · `ProductVariantSummary` · `ProductDetail` · `CategoryTone` |

Design: DAL returns **display-ready summaries** (price/mrp in paise from the default variant, emoji image from `attributes.emoji`, compact rating counts, first badge, hash-derived category tone). The app maps them to `@suplaykart/ui` card props via `apps/web/src/lib/mappers.ts`. Pattern reused: each function takes a `DB` (dependency injection) and is supplier-scoped.

## 3. Routes migrated (Step 3)
| Route | Before (1C) | After (1D) |
| --- | --- | --- |
| `/` | static, mock | **`ƒ` dynamic, live** — categories + Featured + New arrivals + Snacks |
| `/categories` | static, mock | **`ƒ` dynamic, live** — all categories |
| `/products/[slug]` | dynamic, mock | **`ƒ` dynamic, live** — detail + variants + similar; `notFound()` on miss |
| `/search` | static (client), mock | **`ƒ` dynamic, live** — server search via `?q=`, debounced client `SearchBox` |
| `/cart`, `/account` | static, mock | unchanged (mock — no checkout this phase) |

- **Loading (Step 5):** `app/loading.tsx` + `app/products/[slug]/loading.tsx` + `ProductGridSkeleton` (built from `@suplaykart/ui` `Skeleton`).
- **Errors (Step 6):** `app/error.tsx` (DB-offline → graceful retry), `app/not-found.tsx`, `app/products/[slug]/not-found.tsx` (missing product), and `EmptyState` fallbacks for empty category/search/empty store.

## 4. Database verification (Step 4)
Seed expansion (`packages/db/src/seed-catalog.ts`, wired into `pnpm --filter @suplaykart/db seed`), run against **live Neon**:
```
drizzle migrate  →  migrations applied successfully   (exit 0)
seed             →  • default supplier already existed dd24903b-…
                    ✓ catalog: 12 categories, 18 new products
                    ✓ seed complete                    (exit 0)
```
Each product seeded with a default variant (price/mrp in paise, sku) + one image row + `attributes.emoji`. Verified live via screenshots (Featured ordered by review count; prices/discounts/ratings formatted correctly). *(A pg `sslmode` deprecation notice appears — benign upstream warning, not an app issue.)*

## 5. Build verification (Step 7)
```
pnpm typecheck  →  Turbo 3/3 (@suplaykart/db, @suplaykart/ui, web)   exit 0
pnpm build      →  Turbo 1/1 — 5 static + dynamic routes             exit 0
```
Route table confirms `/ /categories /products/[slug] /search` are now `ƒ` (Dynamic, server-rendered against Neon); `/cart /account` static. Strict TS throughout.

Visual (Step 8): Playwright screenshots at **390 / 768 / 1024+** for home, categories, search, PDP — live products render with correct grids, typography, and navigation across all breakpoints.

## 6. Commit hash
`Phase 1D: real data integration` — see the repository log (pushed to `origin/main`).

## 7. Remaining work for Phase 1E
- **Caching / ISR:** data routes are `force-dynamic` now; add `cacheLife`/`revalidateTag` (per the Cache Components plan) for cheap catalog reads.
- **Per-category route** `/c/[category]` (currently category tiles route to search-by-name).
- **Real search:** upgrade ILIKE → Postgres **full-text search**; add facets/sort.
- **Cart persistence:** move `/cart` from mock to a server cart (still no checkout).
- **Auth-aware account:** real Clerk user + addresses + orders list on `/account`.
- **Images:** replace emoji with real product imagery (Blob/R2) using the seeded `product_images`.
- Wire inventory availability into product cards (in/low/out-of-stock) — read-only display.
