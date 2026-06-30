import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import { couponType } from "./enums";
import { users } from "./tenancy";
import { orders } from "./orders";

/**
 * §1.6 — coupons. Phase-1 covers redemption + validation; the admin
 * coupon-creation UI is Phase-2. Phase-1 coupons are seeded via migration.
 */
export const coupons = pgTable("coupons", {
  id: uuid().primaryKey().defaultRandom(),
  code: text().notNull().unique(),
  type: couponType().notNull(),
  value: integer().notNull(), // percent (1–100) or paise
  minOrderAmount: integer(), // paise
  maxDiscountAmount: integer(), // paise
  validFrom: timestamp({ withTimezone: true }),
  validTo: timestamp({ withTimezone: true }),
  usageLimit: integer(), // global
  perUserLimit: integer(),
  isActive: boolean().notNull().default(true),
  ...timestamps,
});

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    couponId: uuid()
      .notNull()
      .references(() => coupons.id),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    orderId: uuid()
      .notNull()
      .references(() => orders.id),
    discountAmount: integer().notNull(), // paise
    redeemedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("coupon_redemptions_coupon_user_idx").on(t.couponId, t.userId)],
);
