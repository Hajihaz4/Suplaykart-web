import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "../client";
import {
  orderItems,
  orders,
  products,
  supplierUsers,
  suppliers,
  users,
} from "../schema";

export type Supplier = typeof suppliers.$inferSelect;
export type SupplierRole =
  | "customer"
  | "support"
  | "ops"
  | "admin"
  | "owner";

/** The single-tenant default supplier (the multi-supplier seam). */
export async function getDefaultSupplier(db: DB) {
  const rows = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.isDefault, true))
    .limit(1);
  return rows[0] ?? null;
}

/** Like getDefaultSupplier, but throws if the store has not been seeded. */
export async function requireDefaultSupplier(db: DB) {
  const supplier = await getDefaultSupplier(db);
  if (!supplier) {
    throw new Error("No default supplier configured — run the database seed.");
  }
  return supplier;
}

export async function listSuppliers(db: DB): Promise<Supplier[]> {
  return db.select().from(suppliers).orderBy(desc(suppliers.isDefault));
}

export async function getSupplier(
  db: DB,
  supplierId: string,
): Promise<Supplier | null> {
  const [row] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);
  return row ?? null;
}

// ── supplier ↔ staff membership (permission seam) ───────────────────────────

export async function assignSupplierUser(
  db: DB,
  supplierId: string,
  userId: string,
  role: SupplierRole = "ops",
): Promise<void> {
  await db
    .insert(supplierUsers)
    .values({ supplierId, userId, role })
    .onConflictDoUpdate({
      target: [supplierUsers.supplierId, supplierUsers.userId],
      set: { role, updatedAt: new Date() },
    });
}

export async function removeSupplierUser(
  db: DB,
  supplierId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(supplierUsers)
    .where(
      and(
        eq(supplierUsers.supplierId, supplierId),
        eq(supplierUsers.userId, userId),
      ),
    );
}

export interface SupplierMember {
  userId: string;
  name: string | null;
  phone: string;
  role: string;
}

export async function listSupplierUsers(
  db: DB,
  supplierId: string,
): Promise<SupplierMember[]> {
  return db
    .select({
      userId: supplierUsers.userId,
      name: users.name,
      phone: users.phone,
      role: supplierUsers.role,
    })
    .from(supplierUsers)
    .innerJoin(users, eq(users.id, supplierUsers.userId))
    .where(eq(supplierUsers.supplierId, supplierId));
}

/** Supplier ids a user has explicit membership in (supplier-scoped access). */
export async function getUserSupplierIds(
  db: DB,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: supplierUsers.supplierId })
    .from(supplierUsers)
    .where(eq(supplierUsers.userId, userId));
  return rows.map((r) => r.id);
}

export async function isSupplierMember(
  db: DB,
  supplierId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: supplierUsers.id })
    .from(supplierUsers)
    .where(
      and(
        eq(supplierUsers.supplierId, supplierId),
        eq(supplierUsers.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// ── supplier report (scoped) ────────────────────────────────────────────────

export interface SupplierReport {
  revenue: number; // paise, delivered
  orders: number;
  delivered: number;
  cancelled: number;
  pending: number;
  products: number;
  topProducts: { name: string; qty: number }[];
}

export async function getSupplierReport(
  db: DB,
  supplierId: string,
): Promise<SupplierReport> {
  const [o] = await db
    .select({
      total: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${orders.status} = 'delivered')::int`,
      cancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')::int`,
      pending: sql<number>`count(*) filter (where ${orders.status} not in ('delivered','cancelled'))::int`,
      revenue: sql<number>`coalesce(sum(${orders.totalAmount}) filter (where ${orders.status} = 'delivered'), 0)::int`,
    })
    .from(orders)
    .where(eq(orders.supplierId, supplierId));

  const [p] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.supplierId, supplierId));

  const top = await db
    .select({
      name: orderItems.productName,
      qty: sql<number>`sum(${orderItems.quantity})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(orders.supplierId, supplierId))
    .groupBy(orderItems.productName)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(5);

  return {
    revenue: o?.revenue ?? 0,
    orders: o?.total ?? 0,
    delivered: o?.delivered ?? 0,
    cancelled: o?.cancelled ?? 0,
    pending: o?.pending ?? 0,
    products: p?.n ?? 0,
    topProducts: top,
  };
}
