import { and, eq } from "drizzle-orm";
import type { DB } from "./client";
import {
  categories,
  inventory,
  productImages,
  productVariants,
  products,
} from "./schema";

/**
 * Phase-1D catalog seed (idempotent) — realistic storefront content.
 * Categories, products (+ default variant + one image). Money in paise.
 */

type SeedCategory = { slug: string; name: string; emoji: string; sort: number };

const CATEGORIES: SeedCategory[] = [
  { slug: "vegetables-fruits", name: "Vegetables & Fruits", emoji: "🥦", sort: 1 },
  { slug: "atta-rice-dal", name: "Atta, Rice & Dal", emoji: "🌾", sort: 2 },
  { slug: "oil-ghee-masala", name: "Oil, Ghee & Masala", emoji: "🫙", sort: 3 },
  { slug: "dairy-bread-eggs", name: "Dairy, Bread & Eggs", emoji: "🥚", sort: 4 },
  { slug: "bakery-biscuits", name: "Bakery & Biscuits", emoji: "🍞", sort: 5 },
  { slug: "chips-namkeen", name: "Chips & Namkeen", emoji: "🥔", sort: 6 },
  { slug: "drinks-juices", name: "Drinks & Juices", emoji: "🥤", sort: 7 },
  { slug: "tea-coffee", name: "Tea & Coffee", emoji: "☕", sort: 8 },
  { slug: "sweets-chocolates", name: "Sweets & Chocolates", emoji: "🍫", sort: 9 },
  { slug: "personal-care", name: "Personal Care", emoji: "🧴", sort: 10 },
  { slug: "cleaning", name: "Cleaning Essentials", emoji: "🧹", sort: 11 },
  { slug: "baby-care", name: "Baby Care", emoji: "👶", sort: 12 },
];

type SeedProduct = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  emoji: string;
  price: number;
  mrp?: number;
  unit: string;
  veg: boolean;
  rating: number;
  ratingCount: number;
  badge?: string;
};

const PRODUCTS: SeedProduct[] = [
  { slug: "top-ramen-masala-240g", name: "Top Ramen Masala Noodles", brand: "Top Ramen", category: "chips-namkeen", emoji: "🍜", price: 4900, mrp: 5300, unit: "240 g", veg: true, rating: 4.3, ratingCount: 270000, badge: "7% OFF" },
  { slug: "amul-butter-500g", name: "Amul Butter Table", brand: "Amul", category: "dairy-bread-eggs", emoji: "🧈", price: 28500, mrp: 32000, unit: "500 g", veg: true, rating: 4.5, ratingCount: 120000, badge: "HOT" },
  { slug: "aavin-full-cream-milk-1l", name: "Aavin Full Cream Milk", brand: "Aavin", category: "dairy-bread-eggs", emoji: "🥛", price: 6200, unit: "1 ltr", veg: true, rating: 4.4, ratingCount: 88000 },
  { slug: "fortune-sunflower-oil-1l", name: "Fortune Sunflower Oil", brand: "Fortune", category: "oil-ghee-masala", emoji: "🫙", price: 18800, mrp: 21000, unit: "1 litre", veg: true, rating: 4.4, ratingCount: 21000, badge: "NEW" },
  { slug: "vkr-ponni-boiled-rice-5kg", name: "VKR Ponni Boiled Rice", brand: "VKR", category: "atta-rice-dal", emoji: "🌾", price: 35000, unit: "5 kg", veg: true, rating: 4.3, ratingCount: 12000 },
  { slug: "maggi-2min-noodles-mega", name: "Maggi 2-Min Noodles Mega Pack", brand: "Maggi", category: "chips-namkeen", emoji: "🍜", price: 16300, mrp: 18000, unit: "900 g", veg: true, rating: 4.5, ratingCount: 530000, badge: "9% OFF" },
  { slug: "coca-cola-750ml", name: "Coca-Cola Soft Drink", brand: "Coca-Cola", category: "drinks-juices", emoji: "🥤", price: 3700, mrp: 4000, unit: "750 ml", veg: true, rating: 4.3, ratingCount: 190000, badge: "7% OFF" },
  { slug: "lays-magic-masala-52g", name: "Lay's India's Magic Masala Chips", brand: "Lay's", category: "chips-namkeen", emoji: "🥔", price: 2500, unit: "52.9 g", veg: true, rating: 4.4, ratingCount: 430000 },
  { slug: "mysore-sandal-soap", name: "Mysore Sandal Soap (Pack of 3)", brand: "Mysore Sandal", category: "personal-care", emoji: "🧼", price: 8700, mrp: 10900, unit: "125g × 3", veg: true, rating: 4.6, ratingCount: 67000, badge: "20% OFF" },
  { slug: "cadbury-dairy-milk-silk", name: "Cadbury Dairy Milk Silk", brand: "Cadbury", category: "sweets-chocolates", emoji: "🍫", price: 16500, mrp: 17500, unit: "150 g", veg: true, rating: 4.7, ratingCount: 310000 },
  { slug: "aashirvaad-atta-5kg", name: "Aashirvaad Superior MP Atta", brand: "Aashirvaad", category: "atta-rice-dal", emoji: "🌾", price: 30700, mrp: 35800, unit: "5 kg", veg: true, rating: 4.5, ratingCount: 15000, badge: "14% OFF" },
  { slug: "farm-fresh-eggs-12", name: "Farm Fresh Eggs", brand: "Suplaykart", category: "dairy-bread-eggs", emoji: "🥚", price: 8500, mrp: 9000, unit: "12 pcs", veg: false, rating: 4.2, ratingCount: 9000 },
  { slug: "tata-tea-gold-500g", name: "Tata Tea Gold", brand: "Tata", category: "tea-coffee", emoji: "🍵", price: 26000, mrp: 28000, unit: "500 g", veg: true, rating: 4.4, ratingCount: 45000 },
  { slug: "surf-excel-matic-1kg", name: "Surf Excel Matic Front Load", brand: "Surf Excel", category: "cleaning", emoji: "🧴", price: 21000, mrp: 23000, unit: "1 kg", veg: true, rating: 4.5, ratingCount: 33000, badge: "9% OFF" },
  { slug: "pampers-diapers-m-56", name: "Pampers All Round Protection M", brand: "Pampers", category: "baby-care", emoji: "👶", price: 79900, mrp: 89900, unit: "56 pcs", veg: true, rating: 4.6, ratingCount: 41000, badge: "11% OFF" },
  { slug: "fresh-bananas-dozen", name: "Fresh Robusta Bananas", brand: "Suplaykart", category: "vegetables-fruits", emoji: "🍌", price: 5900, unit: "1 dozen", veg: true, rating: 4.1, ratingCount: 8000, badge: "NEW" },
  { slug: "modern-bread-400g", name: "Modern White Bread", brand: "Modern", category: "bakery-biscuits", emoji: "🍞", price: 4000, mrp: 4500, unit: "400 g", veg: true, rating: 4.2, ratingCount: 26000 },
  { slug: "parle-g-gold-1kg", name: "Parle-G Gold Biscuits", brand: "Parle", category: "bakery-biscuits", emoji: "🍪", price: 9900, mrp: 11000, unit: "1 kg", veg: true, rating: 4.5, ratingCount: 210000, badge: "10% OFF" },
];

export async function seedCatalog(db: DB, supplierId: string) {
  // 1) categories (idempotent on supplier+slug)
  for (const c of CATEGORIES) {
    await db
      .insert(categories)
      .values({
        supplierId,
        slug: c.slug,
        name: c.name,
        icon: c.emoji,
        sortOrder: c.sort,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  const catRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(eq(categories.supplierId, supplierId));
  const catId = new Map(catRows.map((c) => [c.slug, c.id]));

  // 2) products (+ default variant + image), skipping existing slugs
  let created = 0;
  for (const p of PRODUCTS) {
    const categoryId = catId.get(p.category);
    if (!categoryId) continue;

    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.supplierId, supplierId), eq(products.slug, p.slug)))
      .limit(1);
    if (existing[0]) continue;

    const inserted = await db
      .insert(products)
      .values({
        supplierId,
        categoryId,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        isVeg: p.veg,
        attributes: { emoji: p.emoji },
        badges: p.badge ? [p.badge] : [],
        ratingAvg: String(p.rating),
        ratingCount: p.ratingCount,
        isActive: true,
      })
      .returning({ id: products.id });
    const productId = inserted[0]!.id;

    await db.insert(productVariants).values({
      productId,
      label: p.unit,
      sku: `${p.slug}-default`,
      mrp: p.mrp ?? p.price,
      price: p.price,
      unit: p.unit,
      isDefault: true,
      sortOrder: 0,
      isActive: true,
    });

    await db.insert(productImages).values({
      productId,
      url: `https://cdn.suplaykart.example/products/${p.slug}.png`,
      alt: p.name,
      sortOrder: 0,
    });

    created++;
  }

  // 3) ensure an inventory row for every variant (idempotent on variant unique)
  const variantRows = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(products.supplierId, supplierId));
  let stocked = 0;
  for (const v of variantRows) {
    const r = await db
      .insert(inventory)
      .values({
        variantId: v.id,
        supplierId,
        quantityOnHand: 50,
        quantityReserved: 0,
        lowStockThreshold: 5,
      })
      .onConflictDoNothing()
      .returning({ id: inventory.id });
    if (r[0]) stocked++;
  }

  return { categories: CATEGORIES.length, productsCreated: created, stocked };
}
