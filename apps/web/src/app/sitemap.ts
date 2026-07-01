import type { MetadataRoute } from "next";
import {
  db,
  listCategories,
  listProductSlugs,
  requireDefaultSupplier,
} from "@suplaykart/db";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/categories`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/search`, changeFrequency: "weekly", priority: 0.5 },
  ];

  try {
    const supplier = await requireDefaultSupplier(db);
    const [cats, products] = await Promise.all([
      listCategories(db, supplier.id),
      listProductSlugs(db, supplier.id),
    ]);
    return [
      ...base,
      ...cats.map((c) => ({
        url: `${SITE_URL}/search?q=${encodeURIComponent(c.name)}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...products.map((p) => ({
        url: `${SITE_URL}/products/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // DB unavailable at build/request time — still serve the static core.
    return base;
  }
}
