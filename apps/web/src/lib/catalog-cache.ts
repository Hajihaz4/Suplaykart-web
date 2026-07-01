import { unstable_cache } from "next/cache";
import {
  db,
  listCategories,
  listFeaturedProducts,
  listNewArrivals,
  type CategorySummary,
  type ProductSummary,
} from "@suplaykart/db";

/**
 * Tag-based caching for the pure catalog reads (no per-user data). The per-user
 * bits (cart, wishlist, auth) stay dynamic in the page; only these shared reads
 * are cached and invalidated by tag on admin mutations.
 *
 * Tags: "categories" (category edits) · "products" (product/inventory edits).
 * `available` on products is volatile, so products carry a short revalidate.
 */

export function cachedCategories(
  supplierId: string,
): Promise<CategorySummary[]> {
  return unstable_cache(
    () => listCategories(db, supplierId),
    ["categories", supplierId],
    { tags: ["categories"], revalidate: 600 },
  )();
}

export function cachedFeatured(
  supplierId: string,
  limit: number,
): Promise<ProductSummary[]> {
  return unstable_cache(
    () => listFeaturedProducts(db, supplierId, limit),
    ["featured", supplierId, String(limit)],
    { tags: ["products"], revalidate: 60 },
  )();
}

export function cachedNewArrivals(
  supplierId: string,
  limit: number,
): Promise<ProductSummary[]> {
  return unstable_cache(
    () => listNewArrivals(db, supplierId, limit),
    ["new-arrivals", supplierId, String(limit)],
    { tags: ["products"], revalidate: 60 },
  )();
}
