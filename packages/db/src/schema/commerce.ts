import {
  pgTable,
  uuid,
  integer,
  timestamp,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps, createdAt } from "./_helpers";
import { users } from "./tenancy";
import { productVariants } from "./catalog";

/** §1.5 — one active cart per user (server-persisted for cross-device). */
export const carts = pgTable("carts", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    cartId: uuid()
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer().notNull(),
    addedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("cart_items_cart_variant_uq").on(t.cartId, t.variantId),
    check("cart_items_qty_positive", sql`${t.quantity} > 0`),
  ],
);

/** §1.5 — wishlist. */
export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    variantId: uuid()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    ...createdAt,
  },
  (t) => [uniqueIndex("wishlist_user_variant_uq").on(t.userId, t.variantId)],
);
