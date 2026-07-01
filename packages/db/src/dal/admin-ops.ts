import { and, desc, eq } from "drizzle-orm";
import type { DB } from "../client";
import {
  adminAuditLog,
  categories,
  inventory,
  productVariants,
  products,
  storeSettings,
  users,
} from "../schema";
import { type Executor, adjustStock } from "./inventory";
import { type OrderStatus, updateOrderStatus } from "./orders";

// ── audit ───────────────────────────────────────────────────────────────────

export interface AuditEntry {
  actorUserId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  summary?: string;
  meta?: unknown;
}

export async function writeAudit(exec: Executor, e: AuditEntry): Promise<void> {
  await exec.insert(adminAuditLog).values({
    actorUserId: e.actorUserId,
    action: e.action,
    entity: e.entity,
    entityId: e.entityId ?? null,
    summary: e.summary ?? null,
    meta: (e.meta as object) ?? null,
  });
}

export interface AuditRow {
  id: string;
  action: string;
  entity: string;
  summary: string | null;
  actorName: string | null;
  createdAt: Date;
}

export async function listAuditLog(db: DB, limit = 50): Promise<AuditRow[]> {
  return db
    .select({
      id: adminAuditLog.id,
      action: adminAuditLog.action,
      entity: adminAuditLog.entity,
      summary: adminAuditLog.summary,
      actorName: users.name,
      createdAt: adminAuditLog.createdAt,
    })
    .from(adminAuditLog)
    .leftJoin(users, eq(users.id, adminAuditLog.actorUserId))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);
}

// ── products ────────────────────────────────────────────────────────────────

export interface NewProductInput {
  name: string;
  slug: string;
  brand?: string | null;
  categoryId: string;
  description?: string | null;
  isVeg?: boolean | null;
  emoji?: string | null;
  price: number;
  mrp?: number | null;
  unit: string;
  initialStock?: number;
  lowStockThreshold?: number;
}

export async function createProduct(
  db: DB,
  supplierId: string,
  actorUserId: string,
  input: NewProductInput,
): Promise<string> {
  return db.transaction(async (tx) => {
    const [p] = await tx
      .insert(products)
      .values({
        supplierId,
        categoryId: input.categoryId,
        name: input.name,
        slug: input.slug,
        brand: input.brand ?? null,
        description: input.description ?? null,
        isVeg: input.isVeg ?? null,
        attributes: input.emoji ? { emoji: input.emoji } : null,
        badges: [],
        isActive: true,
      })
      .returning({ id: products.id });
    const [v] = await tx
      .insert(productVariants)
      .values({
        productId: p!.id,
        label: input.unit,
        sku: `${input.slug}-default`,
        mrp: input.mrp ?? input.price,
        price: input.price,
        unit: input.unit,
        isDefault: true,
      })
      .returning({ id: productVariants.id });
    await tx.insert(inventory).values({
      variantId: v!.id,
      supplierId,
      quantityOnHand: input.initialStock ?? 0,
      quantityReserved: 0,
      lowStockThreshold: input.lowStockThreshold ?? 5,
    });
    await writeAudit(tx, {
      actorUserId,
      action: "product.create",
      entity: "product",
      entityId: p!.id,
      summary: `Created product “${input.name}”`,
    });
    return p!.id;
  });
}

export interface EditProductInput {
  name: string;
  brand?: string | null;
  categoryId: string;
  description?: string | null;
  isVeg?: boolean | null;
  emoji?: string | null;
  price: number;
  mrp?: number | null;
  unit: string;
}

export async function updateProduct(
  db: DB,
  supplierId: string,
  actorUserId: string,
  productId: string,
  input: EditProductInput,
): Promise<string | null> {
  return db.transaction(async (tx) => {
    const upd = await tx
      .update(products)
      .set({
        name: input.name,
        brand: input.brand ?? null,
        categoryId: input.categoryId,
        description: input.description ?? null,
        isVeg: input.isVeg ?? null,
        attributes: input.emoji ? { emoji: input.emoji } : null,
      })
      .where(and(eq(products.id, productId), eq(products.supplierId, supplierId)))
      .returning({ id: products.id });
    if (!upd[0]) return null;
    await tx
      .update(productVariants)
      .set({
        label: input.unit,
        unit: input.unit,
        price: input.price,
        mrp: input.mrp ?? input.price,
      })
      .where(
        and(
          eq(productVariants.productId, productId),
          eq(productVariants.isDefault, true),
        ),
      );
    await writeAudit(tx, {
      actorUserId,
      action: "product.update",
      entity: "product",
      entityId: productId,
      summary: `Updated product “${input.name}”`,
    });
    return upd[0].id;
  });
}

export async function setProductActive(
  db: DB,
  supplierId: string,
  actorUserId: string,
  productId: string,
  active: boolean,
): Promise<string | null> {
  const r = await db
    .update(products)
    .set({ isActive: active })
    .where(and(eq(products.id, productId), eq(products.supplierId, supplierId)))
    .returning({ id: products.id });
  if (r[0]) {
    await writeAudit(db, {
      actorUserId,
      action: active ? "product.activate" : "product.hide",
      entity: "product",
      entityId: productId,
      summary: `${active ? "Activated" : "Hid"} product`,
    });
  }
  return r[0]?.id ?? null;
}

export interface ProductEditView {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  categoryId: string;
  description: string | null;
  isVeg: boolean | null;
  emoji: string | null;
  price: number;
  mrp: number | null;
  unit: string;
}

export async function getProductForEdit(
  db: DB,
  supplierId: string,
  id: string,
): Promise<ProductEditView | null> {
  const [p] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.supplierId, supplierId)))
    .limit(1);
  if (!p) return null;
  const [v] = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, id), eq(productVariants.isDefault, true)))
    .limit(1);
  const attrs = (p.attributes ?? {}) as { emoji?: string };
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    categoryId: p.categoryId,
    description: p.description,
    isVeg: p.isVeg,
    emoji: attrs.emoji ?? null,
    price: v?.price ?? 0,
    mrp: v?.mrp ?? null,
    unit: v?.label ?? "",
  };
}

// ── categories ──────────────────────────────────────────────────────────────

export interface CategoryInput {
  name: string;
  slug: string;
  icon?: string | null;
  sortOrder?: number;
}

export async function createCategory(
  db: DB,
  supplierId: string,
  actorUserId: string,
  input: CategoryInput,
): Promise<string> {
  const [c] = await db
    .insert(categories)
    .values({
      supplierId,
      name: input.name,
      slug: input.slug,
      icon: input.icon ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    })
    .returning({ id: categories.id });
  await writeAudit(db, {
    actorUserId,
    action: "category.create",
    entity: "category",
    entityId: c!.id,
    summary: `Created category “${input.name}”`,
  });
  return c!.id;
}

export async function updateCategory(
  db: DB,
  supplierId: string,
  actorUserId: string,
  id: string,
  input: CategoryInput,
): Promise<string | null> {
  const r = await db
    .update(categories)
    .set({
      name: input.name,
      slug: input.slug,
      icon: input.icon ?? null,
      sortOrder: input.sortOrder ?? 0,
    })
    .where(and(eq(categories.id, id), eq(categories.supplierId, supplierId)))
    .returning({ id: categories.id });
  if (r[0]) {
    await writeAudit(db, {
      actorUserId,
      action: "category.update",
      entity: "category",
      entityId: id,
      summary: `Updated category “${input.name}”`,
    });
  }
  return r[0]?.id ?? null;
}

export async function setCategoryActive(
  db: DB,
  supplierId: string,
  actorUserId: string,
  id: string,
  active: boolean,
): Promise<string | null> {
  const r = await db
    .update(categories)
    .set({ isActive: active })
    .where(and(eq(categories.id, id), eq(categories.supplierId, supplierId)))
    .returning({ id: categories.id });
  if (r[0]) {
    await writeAudit(db, {
      actorUserId,
      action: active ? "category.activate" : "category.hide",
      entity: "category",
      entityId: id,
      summary: `${active ? "Activated" : "Hid"} category`,
    });
  }
  return r[0]?.id ?? null;
}

export async function getCategoryForEdit(
  db: DB,
  supplierId: string,
  id: string,
) {
  const [c] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.supplierId, supplierId)))
    .limit(1);
  return c ?? null;
}

// ── inventory ───────────────────────────────────────────────────────────────

export type AdjustResult =
  | { ok: true; onHand: number }
  | { ok: false; error: "not_found" | "below_reserved" };

export async function adjustInventory(
  db: DB,
  supplierId: string,
  actorUserId: string,
  variantId: string,
  delta: number,
  reason?: string,
): Promise<AdjustResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(inventory)
      .where(eq(inventory.variantId, variantId))
      .limit(1);
    if (!row) return { ok: false, error: "not_found" };
    if (row.quantityOnHand + delta < row.quantityReserved) {
      return { ok: false, error: "below_reserved" };
    }
    await adjustStock(tx, supplierId, variantId, delta, actorUserId, reason);
    await writeAudit(tx, {
      actorUserId,
      action: "inventory.adjust",
      entity: "inventory",
      entityId: variantId,
      summary: `Adjusted stock by ${delta > 0 ? "+" : ""}${delta}`,
      meta: { delta, reason: reason ?? null },
    });
    return { ok: true, onHand: row.quantityOnHand + delta };
  });
}

// ── orders ──────────────────────────────────────────────────────────────────

export async function adminSetOrderStatus(
  db: DB,
  actorUserId: string,
  orderId: string,
  status: OrderStatus,
) {
  const order = await updateOrderStatus(db, orderId, status, {
    actor: "staff",
    actorUserId,
    note: `Marked ${status} by staff`,
  });
  await writeAudit(db, {
    actorUserId,
    action: `order.${status}`,
    entity: "order",
    entityId: orderId,
    summary: `Order → ${status}`,
  });
  return order;
}

// ── customers ───────────────────────────────────────────────────────────────

export async function setCustomerBlocked(
  db: DB,
  actorUserId: string,
  userId: string,
  blocked: boolean,
): Promise<string | null> {
  const r = await db
    .update(users)
    .set({ isBlocked: blocked })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (r[0]) {
    await writeAudit(db, {
      actorUserId,
      action: blocked ? "customer.block" : "customer.unblock",
      entity: "customer",
      entityId: userId,
      summary: blocked ? "Blocked customer" : "Unblocked customer",
    });
  }
  return r[0]?.id ?? null;
}

// ── settings ────────────────────────────────────────────────────────────────

export interface StoreSettingsInput {
  isOpen: boolean;
  holidayMode: boolean;
  holidayNote?: string | null;
  deliveryFee: number;
  handlingFee: number;
  freeDeliveryThreshold: number;
  taxInclusive: boolean;
  gstRate?: string | null;
}

export async function upsertStoreSettings(
  db: DB,
  supplierId: string,
  actorUserId: string,
  input: StoreSettingsInput,
) {
  const values = {
    isOpen: input.isOpen,
    holidayMode: input.holidayMode,
    holidayNote: input.holidayNote ?? null,
    deliveryFee: input.deliveryFee,
    handlingFee: input.handlingFee,
    freeDeliveryThreshold: input.freeDeliveryThreshold,
    taxInclusive: input.taxInclusive,
    gstRate: input.gstRate ?? null,
  };
  const [row] = await db
    .insert(storeSettings)
    .values({ supplierId, ...values })
    .onConflictDoUpdate({ target: storeSettings.supplierId, set: values })
    .returning();
  await writeAudit(db, {
    actorUserId,
    action: "settings.update",
    entity: "settings",
    entityId: supplierId,
    summary: "Updated store settings",
  });
  return row!;
}
