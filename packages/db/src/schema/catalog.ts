import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  numeric,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { timestamps, createdAt } from "./_helpers";
import { suppliers } from "./tenancy";

/** §1.2 — self-referential category tree (section → category → subcategory). */
export const categories = pgTable(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    supplierId: uuid()
      .notNull()
      .references(() => suppliers.id),
    parentId: uuid().references((): AnyPgColumn => categories.id),
    name: text().notNull(),
    slug: text().notNull(),
    icon: text(),
    imageUrl: text(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("categories_supplier_slug_uq").on(t.supplierId, t.slug),
    index("categories_supplier_parent_idx").on(
      t.supplierId,
      t.parentId,
      t.sortOrder,
    ),
  ],
);

/** §1.2 — product (sellable units live in product_variants). */
export const products = pgTable(
  "products",
  {
    id: uuid().primaryKey().defaultRandom(),
    supplierId: uuid()
      .notNull()
      .references(() => suppliers.id),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id),
    name: text().notNull(),
    slug: text().notNull(),
    brand: text(),
    description: text(),
    isVeg: boolean(),
    // flexible key-info + nutrition + highlights (variable per product)
    attributes: jsonb(),
    // e.g. ["BESTSELLER","NEW"]
    badges: jsonb(),
    ratingAvg: numeric({ precision: 2, scale: 1 }),
    ratingCount: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_supplier_slug_uq").on(t.supplierId, t.slug),
    index("products_supplier_category_idx").on(
      t.supplierId,
      t.categoryId,
      t.isActive,
    ),
  ],
);

/** §1.2 — the sellable unit; price (paise) lives here. */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: text().notNull(),
    sku: text().unique(),
    mrp: integer().notNull(), // paise
    price: integer().notNull(), // paise (sell price ≤ mrp)
    unit: text(),
    isDefault: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [index("product_variants_product_idx").on(t.productId, t.sortOrder)],
);

/** §1.2 — product imagery (Phase-1 sources real images; table is ready). */
export const productImages = pgTable("product_images", {
  id: uuid().primaryKey().defaultRandom(),
  productId: uuid()
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid().references(() => productVariants.id, {
    onDelete: "set null",
  }),
  url: text().notNull(),
  alt: text(),
  sortOrder: integer().notNull().default(0),
  ...createdAt,
});
