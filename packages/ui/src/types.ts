import type * as React from "react";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  /** default variant id (for add-to-cart) */
  variantId?: string;
  /** price in paise */
  price: number;
  /** MRP in paise */
  mrp?: number;
  unit: string;
  /** emoji fallback (always set) */
  image: string;
  /** real product image URL (R2); falls back to `image` when absent/broken */
  imageUrl?: string;
  /** available stock (default variant); drives low-stock/out-of-stock badges */
  available?: number | null;
  veg?: boolean;
  rating?: number;
  ratingCount?: string;
  badge?: string;
}

export type CategoryTone =
  | "green"
  | "orange"
  | "blue"
  | "pink"
  | "purple"
  | "cyan"
  | "yellow"
  | "gray";

export interface CategoryCardData {
  id: string;
  slug: string;
  name: string;
  icon: string;
  tone?: CategoryTone;
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  accent?: boolean;
}

export type StoreStatus = "open" | "closed" | "holiday";
