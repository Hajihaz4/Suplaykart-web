import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps, createdAt } from "./_helpers";
import { users, suppliers } from "./tenancy";
import { addresses } from "./addresses";
import { productVariants } from "./catalog";
import { coupons } from "./coupons";
import {
  orderStatus,
  paymentMethod,
  paymentStatus,
  actorType,
} from "./enums";

/** §1.7 / §4 / §6 — orders. All money is integer paise. */
export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderNumber: text().notNull().unique(), // human code SP-XXXXXX
    userId: uuid()
      .notNull()
      .references(() => users.id),
    supplierId: uuid()
      .notNull()
      .references(() => suppliers.id),
    status: orderStatus().notNull().default("placed"),
    paymentMethod: paymentMethod().notNull(),
    paymentStatus: paymentStatus().notNull().default("pending"),
    // frozen snapshot of the delivery address at placement
    deliveryAddress: jsonb().notNull(),
    addressId: uuid().references(() => addresses.id),
    // bill (paise)
    subtotal: integer().notNull(),
    itemDiscount: integer().notNull().default(0),
    couponId: uuid().references(() => coupons.id),
    couponDiscount: integer().notNull().default(0),
    deliveryFee: integer().notNull().default(0),
    handlingFee: integer().notNull().default(0),
    surgeFee: integer().notNull().default(0), // Phase-2 (default 0)
    rainFee: integer().notNull().default(0), // Phase-2 (default 0)
    tipAmount: integer().notNull().default(0),
    donationAmount: integer().notNull().default(0),
    taxAmount: integer().notNull().default(0), // GST, inclusive/informational
    totalAmount: integer().notNull(),
    savingsTotal: integer().notNull().default(0),
    deliveryInstructions: jsonb(),
    // timeline stamps
    placedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    confirmedAt: timestamp({ withTimezone: true }),
    packedAt: timestamp({ withTimezone: true }),
    outForDeliveryAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    cancelReason: text(),
    cancelledBy: actorType(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.orderNumber),
    index("orders_user_idx").on(t.userId, t.createdAt),
    index("orders_status_idx").on(t.status),
  ],
);

/** §1.7 — snapshotted order lines (history must not mutate). */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid().references(() => productVariants.id),
    productName: text().notNull(), // snapshot
    variantLabel: text().notNull(), // snapshot
    isVeg: boolean(), // snapshot
    unitPrice: integer().notNull(), // paise, snapshot
    quantity: integer().notNull(),
    lineTotal: integer().notNull(), // paise
    ...createdAt,
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** §1.7 / §4 — drives the tracking timeline. */
export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatus().notNull(),
    note: text(),
    actor: actorType().notNull(),
    actorUserId: uuid().references(() => users.id),
    ...createdAt,
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId, t.createdAt)],
);

/** §1.7 — post-delivery rating (product reviews are Phase-2). */
export const orderRatings = pgTable(
  "order_ratings",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    rating: integer().notNull(),
    comment: text(),
    ...createdAt,
  },
  (t) => [check("order_ratings_range", sql`${t.rating} between 1 and 5`)],
);
