import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createdAt } from "./_helpers";
import { suppliers, users } from "./tenancy";
import { productVariants } from "./catalog";
import { orders } from "./orders";
import { inventoryMovementType } from "./enums";

/**
 * §1.3 / §5 — stock per variant (single warehouse in Phase-1).
 * available = quantity_on_hand − quantity_reserved (never < 0).
 */
export const inventory = pgTable(
  "inventory",
  {
    id: uuid().primaryKey().defaultRandom(),
    variantId: uuid()
      .notNull()
      .unique()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    supplierId: uuid()
      .notNull()
      .references(() => suppliers.id),
    quantityOnHand: integer().notNull().default(0),
    quantityReserved: integer().notNull().default(0),
    lowStockThreshold: integer().notNull().default(0),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("inventory_on_hand_nonneg", sql`${t.quantityOnHand} >= 0`),
    check("inventory_reserved_nonneg", sql`${t.quantityReserved} >= 0`),
    check(
      "inventory_reserved_le_on_hand",
      sql`${t.quantityReserved} <= ${t.quantityOnHand}`,
    ),
  ],
);

/**
 * §5 — append-only inventory ledger (audit + reconciliation).
 * Admin movements (restock/adjust) must carry actorUserId (app-enforced).
 */
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid().primaryKey().defaultRandom(),
    variantId: uuid()
      .notNull()
      .references(() => productVariants.id),
    supplierId: uuid()
      .notNull()
      .references(() => suppliers.id),
    type: inventoryMovementType().notNull(),
    quantityDelta: integer().notNull(),
    reason: text(),
    orderId: uuid().references(() => orders.id),
    // NULL only for system movements (reserve/release/sale); required for
    // restock/adjust (admin accountability — enforced at the app layer).
    actorUserId: uuid().references(() => users.id),
    ...createdAt,
  },
  (t) => [
    index("inventory_movements_variant_idx").on(t.variantId, t.createdAt),
    index("inventory_movements_order_idx").on(t.orderId),
  ],
);
