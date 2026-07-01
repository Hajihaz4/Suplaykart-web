import {
  pgTable,
  uuid,
  text,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import { userRole } from "./enums";

/**
 * §1.1 — the single-tenant seam. Phase-1 seeds exactly one default row
 * ("Suplaykart Store"). Catalog / inventory / orders all FK to it so
 * multi-supplier is a future additive migration. No supplier auth/onboarding.
 */
export const suppliers = pgTable("suppliers", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  isDefault: boolean().notNull().default(false),
  isActive: boolean().notNull().default(true),
  ...timestamps,
});

/**
 * §1.1 — customer AND staff profiles. Identity is owned by Clerk; this is the
 * local mirror keyed by `clerkUserId`. `role` distinguishes customer vs staff
 * tiers (§2/§3).
 */
export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  clerkUserId: text().notNull().unique(),
  phone: text().notNull().unique(),
  name: text(),
  email: text(),
  role: userRole().notNull().default("customer"),
  isBlocked: boolean().notNull().default(false),
  // Logical FK → addresses.id. Intentionally NOT a hard FK to avoid a
  // users↔addresses circular dependency; enforced at the app layer.
  defaultAddressId: uuid(),
  ...timestamps,
});

/**
 * Phase 2J — supplier ↔ staff membership (the multi-supplier permission seam).
 * In single-tenant mode every staff user maps to the one default supplier; the
 * mapping makes supplier-scoped access an additive, non-destructive change.
 */
export const supplierUsers = pgTable(
  "supplier_users",
  {
    id: uuid().primaryKey().defaultRandom(),
    supplierId: uuid()
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRole().notNull().default("ops"),
    ...timestamps,
  },
  (t) => [uniqueIndex("supplier_users_uq").on(t.supplierId, t.userId)],
);
