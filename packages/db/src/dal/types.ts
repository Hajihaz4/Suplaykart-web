/** Display-ready DAL shapes (formatted for the storefront UI). */

export type CategoryTone =
  | "green"
  | "orange"
  | "blue"
  | "pink"
  | "purple"
  | "cyan"
  | "yellow"
  | "gray";

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
  icon: string;
  tone: CategoryTone;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  /** default variant id (for add-to-cart) */
  variantId: string;
  /** price in paise (default variant) */
  price: number;
  /** MRP in paise, or null when there is no discount */
  mrp: number | null;
  unit: string;
  /** emoji (from product.attributes.emoji) */
  image: string;
  veg: boolean | null;
  rating: number | null;
  ratingCount: string | null;
  badge: string | null;
}

export interface ProductVariantSummary {
  id: string;
  label: string;
  price: number;
  mrp: number | null;
  isDefault: boolean;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  categoryName: string | null;
  variants: ProductVariantSummary[];
  images: { url: string; alt: string | null }[];
}

export interface CartItemView {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  unit: string;
  image: string;
  price: number;
  mrp: number | null;
  veg: boolean | null;
  quantity: number;
  lineTotal: number;
}

export interface CartView {
  items: CartItemView[];
  subtotal: number;
  itemCount: number;
  savings: number;
}
