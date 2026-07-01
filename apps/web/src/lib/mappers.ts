import type { CategoryCardData, ProductCardData } from "@suplaykart/ui";
import type { CategorySummary, ProductSummary } from "@suplaykart/db";

/** Map DAL summaries → UI card props (null → undefined). */
export function toProductCard(s: ProductSummary): ProductCardData {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    brand: s.brand ?? undefined,
    variantId: s.variantId,
    price: s.price,
    mrp: s.mrp ?? undefined,
    unit: s.unit,
    image: s.image,
    imageUrl: s.imageUrl ?? undefined,
    available: s.available,
    veg: s.veg ?? undefined,
    rating: s.rating ?? undefined,
    ratingCount: s.ratingCount ?? undefined,
    badge: s.badge ?? undefined,
  };
}

export function toCategoryCard(c: CategorySummary): CategoryCardData {
  return { id: c.id, slug: c.slug, name: c.name, icon: c.icon, tone: c.tone };
}
