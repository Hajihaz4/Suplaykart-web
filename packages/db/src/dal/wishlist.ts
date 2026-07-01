import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "../client";
import {
  inventory,
  productImages,
  productVariants,
  products,
  wishlistItems,
} from "../schema";
import type { ProductSummary } from "./types";

function formatCount(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export async function addToWishlist(
  db: DB,
  userId: string,
  variantId: string,
): Promise<void> {
  await db
    .insert(wishlistItems)
    .values({ userId, variantId })
    .onConflictDoNothing();
}

export async function removeFromWishlist(
  db: DB,
  userId: string,
  variantId: string,
): Promise<void> {
  await db
    .delete(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.variantId, variantId),
      ),
    );
}

export async function isInWishlist(
  db: DB,
  userId: string,
  variantId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.variantId, variantId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function listWishlistedVariantIds(
  db: DB,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ v: wishlistItems.variantId })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId));
  return rows.map((r) => r.v);
}

export async function wishlistCount(db: DB, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId));
  return row?.n ?? 0;
}

export async function listWishlist(
  db: DB,
  userId: string,
): Promise<ProductSummary[]> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: products.brand,
      attributes: products.attributes,
      badges: products.badges,
      isVeg: products.isVeg,
      ratingAvg: products.ratingAvg,
      ratingCount: products.ratingCount,
      vId: productVariants.id,
      vLabel: productVariants.label,
      vPrice: productVariants.price,
      vMrp: productVariants.mrp,
      available: sql<number | null>`(
        select ${inventory.quantityOnHand} - ${inventory.quantityReserved}
        from ${inventory} where ${inventory.variantId} = ${productVariants.id}
      )`,
      imageUrl: sql<string | null>`(
        select ${productImages.url} from ${productImages}
        where ${productImages.productId} = ${products.id}
        order by ${productImages.sortOrder} asc, ${productImages.createdAt} asc
        limit 1
      )`,
    })
    .from(wishlistItems)
    .innerJoin(productVariants, eq(productVariants.id, wishlistItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(eq(wishlistItems.userId, userId), eq(products.isActive, true)),
    )
    .orderBy(desc(wishlistItems.createdAt));

  return rows.map((r) => {
    const attrs = (r.attributes ?? {}) as { emoji?: string };
    const badges = Array.isArray(r.badges) ? (r.badges as string[]) : [];
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      brand: r.brand,
      variantId: r.vId,
      price: r.vPrice,
      mrp: r.vMrp > r.vPrice ? r.vMrp : null,
      unit: r.vLabel,
      image: attrs.emoji ?? "📦",
      imageUrl: r.imageUrl,
      available: r.available,
      veg: r.isVeg,
      rating: r.ratingAvg != null ? Number(r.ratingAvg) : null,
      ratingCount: formatCount(r.ratingCount),
      badge: badges[0] ?? null,
    } satisfies ProductSummary;
  });
}
