import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { DB } from "../client";
import { categories, productImages, productVariants, products } from "../schema";
import type {
  CategorySummary,
  CategoryTone,
  ProductDetail,
  ProductSummary,
} from "./types";

const TONES: CategoryTone[] = [
  "green",
  "orange",
  "blue",
  "pink",
  "purple",
  "cyan",
  "yellow",
  "gray",
];

/** Deterministic tile color from a category slug. */
function toneFor(slug: string): CategoryTone {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length]!;
}

/** Compact review counts (270000 → "2.7L", 88000 → "88k"). */
function formatCount(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

const summaryCols = {
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
};

type SummaryRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  attributes: unknown;
  badges: unknown;
  isVeg: boolean | null;
  ratingAvg: string | null;
  ratingCount: number;
  vId: string;
  vLabel: string;
  vPrice: number;
  vMrp: number;
};

function mapSummary(r: SummaryRow): ProductSummary {
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
    veg: r.isVeg,
    rating: r.ratingAvg != null ? Number(r.ratingAvg) : null,
    ratingCount: formatCount(r.ratingCount),
    badge: badges[0] ?? null,
  };
}

const defaultVariantJoin = and(
  eq(productVariants.productId, products.id),
  eq(productVariants.isDefault, true),
);

async function queryProducts(
  db: DB,
  where: SQL | undefined,
  orderBy: SQL,
  limit: number,
): Promise<ProductSummary[]> {
  const rows = await db
    .select(summaryCols)
    .from(products)
    .innerJoin(productVariants, defaultVariantJoin)
    .where(where)
    .orderBy(orderBy)
    .limit(limit);
  return rows.map(mapSummary);
}

// ── Categories ────────────────────────────────────────────────────────────

export async function listCategories(
  db: DB,
  supplierId: string,
): Promise<CategorySummary[]> {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      icon: categories.icon,
    })
    .from(categories)
    .where(
      and(eq(categories.supplierId, supplierId), eq(categories.isActive, true)),
    )
    .orderBy(asc(categories.sortOrder));
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    icon: c.icon ?? "🛒",
    tone: toneFor(c.slug),
  }));
}

export async function getCategoryBySlug(
  db: DB,
  supplierId: string,
  slug: string,
) {
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.supplierId, supplierId), eq(categories.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

// ── Product lists ─────────────────────────────────────────────────────────

export function listFeaturedProducts(db: DB, supplierId: string, limit = 10) {
  return queryProducts(
    db,
    and(eq(products.supplierId, supplierId), eq(products.isActive, true)),
    desc(products.ratingCount),
    limit,
  );
}

export function listNewArrivals(db: DB, supplierId: string, limit = 10) {
  return queryProducts(
    db,
    and(eq(products.supplierId, supplierId), eq(products.isActive, true)),
    desc(products.createdAt),
    limit,
  );
}

export function listProductsByCategory(
  db: DB,
  supplierId: string,
  categoryId: string,
  limit = 20,
) {
  return queryProducts(
    db,
    and(
      eq(products.supplierId, supplierId),
      eq(products.isActive, true),
      eq(products.categoryId, categoryId),
    ),
    asc(products.name),
    limit,
  );
}

/** Search by product name, brand, or category name (ILIKE). */
export async function searchProducts(
  db: DB,
  supplierId: string,
  query: string,
  limit = 30,
): Promise<ProductSummary[]> {
  const q = `%${query}%`;
  const rows = await db
    .select(summaryCols)
    .from(products)
    .innerJoin(productVariants, defaultVariantJoin)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.supplierId, supplierId),
        eq(products.isActive, true),
        or(
          ilike(products.name, q),
          ilike(products.brand, q),
          ilike(categories.name, q),
        ),
      ),
    )
    .orderBy(asc(products.name))
    .limit(limit);
  return rows.map(mapSummary);
}

/** All active product slugs (for the sitemap). */
export async function listProductSlugs(
  db: DB,
  supplierId: string,
): Promise<{ slug: string; updatedAt: Date }[]> {
  return db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(
      and(eq(products.supplierId, supplierId), eq(products.isActive, true)),
    );
}

// ── Product detail ────────────────────────────────────────────────────────

export async function getProductDetailBySlug(
  db: DB,
  supplierId: string,
  slug: string,
): Promise<ProductDetail | null> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: products.brand,
      description: products.description,
      attributes: products.attributes,
      badges: products.badges,
      isVeg: products.isVeg,
      ratingAvg: products.ratingAvg,
      ratingCount: products.ratingCount,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.supplierId, supplierId),
        eq(products.slug, slug),
        eq(products.isActive, true),
      ),
    )
    .limit(1);

  const p = rows[0];
  if (!p) return null;

  const variants = await db
    .select({
      id: productVariants.id,
      label: productVariants.label,
      price: productVariants.price,
      mrp: productVariants.mrp,
      isDefault: productVariants.isDefault,
    })
    .from(productVariants)
    .where(eq(productVariants.productId, p.id))
    .orderBy(asc(productVariants.sortOrder));

  const imgs = await db
    .select({ url: productImages.url, alt: productImages.alt })
    .from(productImages)
    .where(eq(productImages.productId, p.id))
    .orderBy(asc(productImages.sortOrder));

  const def = variants.find((v) => v.isDefault) ?? variants[0];
  const attrs = (p.attributes ?? {}) as { emoji?: string };
  const badges = Array.isArray(p.badges) ? (p.badges as string[]) : [];

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    variantId: def?.id ?? "",
    description: p.description,
    price: def?.price ?? 0,
    mrp: def && def.mrp != null && def.mrp > def.price ? def.mrp : null,
    unit: def?.label ?? "",
    image: attrs.emoji ?? "📦",
    veg: p.isVeg,
    rating: p.ratingAvg != null ? Number(p.ratingAvg) : null,
    ratingCount: formatCount(p.ratingCount),
    badge: badges[0] ?? null,
    categoryName: p.categoryName,
    variants: variants.map((v) => ({
      id: v.id,
      label: v.label,
      price: v.price,
      mrp: v.mrp != null && v.mrp > v.price ? v.mrp : null,
      isDefault: v.isDefault,
    })),
    images: imgs.map((i) => ({ url: i.url, alt: i.alt })),
  };
}
