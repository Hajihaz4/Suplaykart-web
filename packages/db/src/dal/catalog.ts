import { and, asc, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import type { DB } from "../client";
import {
  categories,
  inventory,
  productImages,
  productVariants,
  products,
} from "../schema";
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
  available: sql<number | null>`(
    select ${inventory.quantityOnHand} - ${inventory.quantityReserved}
    from ${inventory}
    where ${inventory.variantId} = ${productVariants.id}
  )`,
  imageUrl: sql<string | null>`(
    select ${productImages.url}
    from ${productImages}
    where ${productImages.productId} = ${products.id}
    order by ${productImages.sortOrder} asc, ${productImages.createdAt} asc
    limit 1
  )`,
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
  available: number | null;
  imageUrl: string | null;
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
    imageUrl: r.imageUrl,
    available: r.available,
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

/** Related products from the same category (excludes the product itself). */
export function listRelatedProducts(
  db: DB,
  supplierId: string,
  categoryId: string,
  excludeProductId: string,
  limit = 8,
): Promise<ProductSummary[]> {
  return queryProducts(
    db,
    and(
      eq(products.supplierId, supplierId),
      eq(products.isActive, true),
      eq(products.categoryId, categoryId),
      ne(products.id, excludeProductId),
    ),
    desc(products.ratingCount),
    limit,
  );
}

// ── full-text search (Postgres FTS + ranking + synonyms + prefix) ───────────

/** Small hand-curated synonym set for grocery search. */
const SYNONYMS: Record<string, string[]> = {
  coke: ["cola", "coca"],
  cola: ["coke", "coca"],
  atta: ["flour", "wheat"],
  flour: ["atta"],
  curd: ["yogurt", "dahi"],
  dahi: ["curd", "yogurt"],
  chips: ["namkeen", "wafers"],
  soap: ["bathing"],
  oil: ["ghee"],
  noodles: ["maggi", "ramen"],
  biscuit: ["cookie", "biscuits"],
};

const SEARCH_VECTOR = sql`to_tsvector('english', coalesce(${products.name}, '') || ' ' || coalesce(${products.brand}, '') || ' ' || coalesce(${products.description}, ''))`;

/** Build a safe to_tsquery string: prefix (:*) per token, synonyms OR-ed. */
function buildTsQuery(query: string): string {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .slice(0, 6);
  if (tokens.length === 0) return "";
  return tokens
    .map((tok) => {
      const group = [tok, ...(SYNONYMS[tok] ?? [])];
      return `(${group.map((g) => `${g}:*`).join(" | ")})`;
    })
    .join(" & ");
}

export type SearchSort = "relevance" | "price_asc" | "price_desc" | "rating";

export interface SearchOptions {
  categorySlug?: string;
  sort?: SearchSort;
  limit?: number;
}

export async function searchProducts(
  db: DB,
  supplierId: string,
  query: string,
  options: SearchOptions = {},
): Promise<ProductSummary[]> {
  const tsq = buildTsQuery(query);
  if (!tsq) return [];
  const limit = options.limit ?? 30;

  const conds = [
    eq(products.supplierId, supplierId),
    eq(products.isActive, true),
    sql`${SEARCH_VECTOR} @@ to_tsquery('english', ${tsq})`,
  ];
  if (options.categorySlug) conds.push(eq(categories.slug, options.categorySlug));

  const orderBy =
    options.sort === "price_asc"
      ? asc(productVariants.price)
      : options.sort === "price_desc"
        ? desc(productVariants.price)
        : options.sort === "rating"
          ? desc(products.ratingAvg)
          : desc(sql`ts_rank(${SEARCH_VECTOR}, to_tsquery('english', ${tsq}))`);

  const rows = await db
    .select(summaryCols)
    .from(products)
    .innerJoin(productVariants, defaultVariantJoin)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conds))
    .orderBy(orderBy)
    .limit(limit);
  return rows.map(mapSummary);
}

export interface SearchFacet {
  slug: string;
  name: string;
  count: number;
}

/** Category facets (counts) for a search query. */
export async function searchFacets(
  db: DB,
  supplierId: string,
  query: string,
): Promise<SearchFacet[]> {
  const tsq = buildTsQuery(query);
  if (!tsq) return [];
  return db
    .select({
      slug: categories.slug,
      name: categories.name,
      count: sql<number>`count(*)::int`,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.supplierId, supplierId),
        eq(products.isActive, true),
        sql`${SEARCH_VECTOR} @@ to_tsquery('english', ${tsq})`,
      ),
    )
    .groupBy(categories.slug, categories.name)
    .orderBy(desc(sql`count(*)`));
}

/** Lightweight as-you-type suggestions (product names). */
export async function searchSuggestions(
  db: DB,
  supplierId: string,
  query: string,
  limit = 6,
): Promise<{ name: string; slug: string }[]> {
  const tsq = buildTsQuery(query);
  if (!tsq) return [];
  return db
    .select({ name: products.name, slug: products.slug })
    .from(products)
    .where(
      and(
        eq(products.supplierId, supplierId),
        eq(products.isActive, true),
        sql`${SEARCH_VECTOR} @@ to_tsquery('english', ${tsq})`,
      ),
    )
    .orderBy(desc(sql`ts_rank(${SEARCH_VECTOR}, to_tsquery('english', ${tsq}))`))
    .limit(limit);
}

/** Products for a list of slugs, preserving the given order (recently viewed). */
export async function listProductsBySlugs(
  db: DB,
  supplierId: string,
  slugs: string[],
): Promise<ProductSummary[]> {
  if (slugs.length === 0) return [];
  const rows = await db
    .select(summaryCols)
    .from(products)
    .innerJoin(productVariants, defaultVariantJoin)
    .where(
      and(
        eq(products.supplierId, supplierId),
        eq(products.isActive, true),
        inArray(products.slug, slugs),
      ),
    );
  const bySlug = new Map(rows.map((r) => [r.slug, mapSummary(r)]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((x): x is ProductSummary => Boolean(x));
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
      categoryId: products.categoryId,
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

  let available: number | null = null;
  if (def) {
    const [av] = await db
      .select({
        a: sql<number>`(${inventory.quantityOnHand} - ${inventory.quantityReserved})::int`,
      })
      .from(inventory)
      .where(eq(inventory.variantId, def.id))
      .limit(1);
    available = av?.a ?? null;
  }

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
    imageUrl: imgs[0]?.url ?? null,
    available,
    veg: p.isVeg,
    rating: p.ratingAvg != null ? Number(p.ratingAvg) : null,
    ratingCount: formatCount(p.ratingCount),
    badge: badges[0] ?? null,
    badges,
    categoryId: p.categoryId,
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
