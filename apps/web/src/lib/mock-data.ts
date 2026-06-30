import type { CategoryCardData, ProductCardData } from "@suplaykart/ui";

/** Phase 1C mock catalog (UI only — no API). Prices are in paise. */

export const CATEGORIES: CategoryCardData[] = [
  { id: "c1", slug: "vegetables-fruits", name: "Vegetables & Fruits", icon: "🥦", tone: "green" },
  { id: "c2", slug: "atta-rice-dal", name: "Atta, Rice & Dal", icon: "🌾", tone: "orange" },
  { id: "c3", slug: "oil-ghee-masala", name: "Oil, Ghee & Masala", icon: "🫙", tone: "blue" },
  { id: "c4", slug: "dairy-bread-eggs", name: "Dairy, Bread & Eggs", icon: "🥚", tone: "pink" },
  { id: "c5", slug: "bakery-biscuits", name: "Bakery & Biscuits", icon: "🍞", tone: "purple" },
  { id: "c6", slug: "chips-namkeen", name: "Chips & Namkeen", icon: "🥔", tone: "yellow" },
  { id: "c7", slug: "drinks-juices", name: "Drinks & Juices", icon: "🥤", tone: "cyan" },
  { id: "c8", slug: "tea-coffee", name: "Tea & Coffee", icon: "☕", tone: "gray" },
  { id: "c9", slug: "sweets-chocolates", name: "Sweets & Chocolates", icon: "🍫", tone: "pink" },
  { id: "c10", slug: "personal-care", name: "Personal Care", icon: "🧴", tone: "blue" },
  { id: "c11", slug: "cleaning", name: "Cleaning Essentials", icon: "🧹", tone: "green" },
  { id: "c12", slug: "baby-care", name: "Baby Care", icon: "👶", tone: "orange" },
];

export const PRODUCTS: ProductCardData[] = [
  { id: "p1", slug: "top-ramen-masala-240g", name: "Top Ramen Masala Noodles", brand: "Top Ramen", price: 4900, mrp: 5300, unit: "240 g", image: "🍜", veg: true, rating: 4.3, ratingCount: "2.7L", badge: "7% OFF" },
  { id: "p2", slug: "amul-butter-500g", name: "Amul Butter Table", brand: "Amul", price: 28500, mrp: 32000, unit: "500 g", image: "🧈", veg: true, rating: 4.5, ratingCount: "1.2L", badge: "HOT" },
  { id: "p3", slug: "aavin-full-cream-milk-1l", name: "Aavin Full Cream Milk", brand: "Aavin", price: 6200, unit: "1 ltr", image: "🥛", veg: true, rating: 4.4, ratingCount: "88k" },
  { id: "p4", slug: "fortune-sunflower-oil-1l", name: "Fortune Sunflower Oil", brand: "Fortune", price: 18800, mrp: 21000, unit: "1 litre", image: "🫙", veg: true, rating: 4.4, ratingCount: "21k", badge: "NEW" },
  { id: "p5", slug: "vkr-ponni-boiled-rice-5kg", name: "VKR Ponni Boiled Rice", brand: "VKR", price: 35000, unit: "5 kg", image: "🌾", veg: true, rating: 4.3, ratingCount: "12k" },
  { id: "p6", slug: "maggi-2min-noodles-mega", name: "Maggi 2-Min Noodles Mega Pack", brand: "Maggi", price: 16300, mrp: 18000, unit: "900 g", image: "🍜", veg: true, rating: 4.5, ratingCount: "5.3L", badge: "9% OFF" },
  { id: "p7", slug: "coca-cola-750ml", name: "Coca-Cola Soft Drink", brand: "Coca-Cola", price: 3700, mrp: 4000, unit: "750 ml", image: "🥤", veg: true, rating: 4.3, ratingCount: "1.9L", badge: "7% OFF" },
  { id: "p8", slug: "lays-magic-masala-52g", name: "Lay's India's Magic Masala Chips", brand: "Lay's", price: 2500, unit: "52.9 g", image: "🥔", veg: true, rating: 4.4, ratingCount: "4.3L" },
  { id: "p9", slug: "mysore-sandal-soap", name: "Mysore Sandal Soap (Pack of 3)", brand: "Mysore Sandal", price: 8700, mrp: 10900, unit: "125g × 3", image: "🧼", veg: true, rating: 4.6, ratingCount: "67k", badge: "20% OFF" },
  { id: "p10", slug: "cadbury-dairy-milk-silk", name: "Cadbury Dairy Milk Silk", brand: "Cadbury", price: 16500, mrp: 17500, unit: "150 g", image: "🍫", veg: true, rating: 4.7, ratingCount: "3.1L" },
  { id: "p11", slug: "aashirvaad-atta-5kg", name: "Aashirvaad Superior MP Atta", brand: "Aashirvaad", price: 30700, mrp: 35800, unit: "5 kg", image: "🌾", veg: true, rating: 4.5, ratingCount: "15k", badge: "14% OFF" },
  { id: "p12", slug: "fresh-eggs-12", name: "Farm Fresh Eggs", brand: "Suplaykart", price: 8500, mrp: 9000, unit: "12 pcs", image: "🥚", veg: false, rating: 4.2, ratingCount: "9k" },
];

export interface HomeSection {
  title: string;
  actionHref: string;
  productIds: string[];
}

export const HOME_SECTIONS: HomeSection[] = [
  { title: "Grocery Essentials", actionHref: "/categories", productIds: ["p1", "p2", "p3", "p4", "p5", "p6"] },
  { title: "Refreshing Drinks 🥤", actionHref: "/categories", productIds: ["p7", "p10", "p8"] },
  { title: "Personal Care ✨", actionHref: "/categories", productIds: ["p9", "p11", "p12"] },
];

export interface CartLine {
  product: ProductCardData;
  qty: number;
}

export function getProductBySlug(slug: string): ProductCardData | null {
  return PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function getProducts(ids: string[]): ProductCardData[] {
  return ids
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is ProductCardData => Boolean(p));
}

export const CART_LINES: CartLine[] = [
  { product: PRODUCTS[2]!, qty: 2 },
  { product: PRODUCTS[1]!, qty: 1 },
  { product: PRODUCTS[9]!, qty: 1 },
  { product: PRODUCTS[7]!, qty: 3 },
];
