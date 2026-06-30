import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps, createdAt } from "./_helpers";
import { suppliers } from "./tenancy";
import { serviceStatus } from "./enums";

/** §1.8 — per-supplier store config (singleton in Phase-1). */
export const storeSettings = pgTable("store_settings", {
  id: uuid().primaryKey().defaultRandom(),
  supplierId: uuid()
    .notNull()
    .unique()
    .references(() => suppliers.id),
  isOpen: boolean().notNull().default(true),
  holidayMode: boolean().notNull().default(false),
  holidayNote: text(),
  storeHours: jsonb(), // per-day open/close
  deliveryFee: integer().notNull().default(0), // paise
  handlingFee: integer().notNull().default(0), // paise
  freeDeliveryThreshold: integer().notNull().default(0), // paise
  taxInclusive: boolean().notNull().default(true),
  gstRate: numeric(),
  ...timestamps,
});

/** §1.8 — serviceability (drives gate / coming-soon / pincode checker). */
export const serviceableAreas = pgTable(
  "serviceable_areas",
  {
    id: uuid().primaryKey().defaultRandom(),
    supplierId: uuid()
      .notNull()
      .references(() => suppliers.id),
    pincode: text().notNull(),
    city: text().notNull(),
    areaName: text(),
    status: serviceStatus().notNull().default("coming_soon"),
    expectedLaunch: text(),
    isActive: boolean().notNull().default(true),
    ...createdAt,
  },
  (t) => [
    uniqueIndex("serviceable_areas_supplier_pincode_uq").on(
      t.supplierId,
      t.pincode,
    ),
  ],
);

/** §1.8 — out-of-service "notify me" waitlist. */
export const waitlistSignups = pgTable("waitlist_signups", {
  id: uuid().primaryKey().defaultRandom(),
  phone: text().notNull(),
  city: text(),
  pincode: text(),
  interests: jsonb(),
  ...createdAt,
});
