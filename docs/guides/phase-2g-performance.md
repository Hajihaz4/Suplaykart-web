# Phase 2G — Performance & Caching

## Caching + revalidation (tag-based)
The storefront pages are dynamic (per-user cart/wishlist/auth), but the **shared
catalog reads are cached and invalidated by tag** (`lib/catalog-cache.ts`,
`unstable_cache`):

| Cache | Tag | Revalidate | Invalidated by |
| --- | --- | --- | --- |
| `cachedCategories` | `categories` | 600s | category create/update/toggle |
| `cachedFeatured` / `cachedNewArrivals` | `products` | 60s | product create/update/toggle, inventory adjust |

Admin mutations call `revalidateTag(...)` so edits show immediately; the short
`products` window keeps the volatile `available` (stock) indicator reasonably
fresh without busting the cache on every order (checkout re-checks stock
authoritatively regardless).

## Query optimization
- Catalog summaries fetch `imageUrl` + `available` via correlated subqueries on
  the default variant (one round-trip per list, no N+1).
- Order/notification list reads batch their item/pref lookups with `inArray`.
- Search uses Postgres FTS (`to_tsquery` + `ts_rank`).

## Bundle optimization
- `experimental.optimizePackageImports: ["lucide-react"]` tree-shakes icon
  barrel imports across all routes.
- Shared First Load JS ≈ 102 kB; per-route 102–160 kB.

## Image optimization
- `next/image` remote pattern is wired to the R2 host; product images serve from
  R2's CDN. (Card/gallery use plain `<img loading="lazy">` for the framework-
  agnostic `@suplaykart/ui` layer + emoji fallback.)

## Database performance — recommendations at scale
- **Add a functional GIN index** on the product search vector when the catalog
  grows: `CREATE INDEX products_search_idx ON products USING gin (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,'')));` — FTS works without it today, but the index avoids seq scans at scale.
- Existing indexes cover the hot paths: `orders_user_idx`, `orders_status_idx`,
  `notifications_user_idx`, `push_subscriptions_user_idx`,
  `products_supplier_category_idx`, unique indexes on cart/wishlist pairs,
  `inventory.variant_id` (unique).
- Consider a materialized `available` column (or per-category product cache) if
  the correlated subqueries become hot.

## Notes
- **Cache Components** (PPR / `use cache`) is a Next 16 feature; this project is
  on Next 15, so tag-based `unstable_cache` is the equivalent applied here.
