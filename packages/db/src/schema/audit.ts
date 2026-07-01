import { pgTable, uuid, text, jsonb, index } from "drizzle-orm/pg-core";
import { createdAt } from "./_helpers";
import { users } from "./tenancy";

/**
 * §3 — append-only admin audit trail. Every staff mutation (product/category
 * CRUD, inventory adjust, order status, customer block, settings) writes one
 * row. Order status + stock also have their own domain ledgers
 * (order_status_history, inventory_movements); this is the cross-cutting log.
 */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    actorUserId: uuid().references(() => users.id),
    action: text().notNull(), // e.g. "product.create"
    entity: text().notNull(), // "product" | "category" | "order" | ...
    entityId: text(),
    summary: text(),
    meta: jsonb(),
    ...createdAt,
  },
  (t) => [index("admin_audit_actor_idx").on(t.actorUserId, t.createdAt)],
);
