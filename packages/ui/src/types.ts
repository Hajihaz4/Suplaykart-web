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
  /** emoji or image url */
  image: string;
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
