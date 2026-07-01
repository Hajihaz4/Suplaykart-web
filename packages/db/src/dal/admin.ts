import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { DB } from "../client";
import {
  addresses,
  categories,
  inventory,
  orderItems,
  orderStatusHistory,
  orders,
  productVariants,
  products,
  storeSettings,
  users,
} from "../schema";
import type { OrderStatus, PaymentMethodValue } from "./orders";

// ── dashboard ───────────────────────────────────────────────────────────────

export interface AdminStats {
  products: number;
  activeProducts: number;
  categories: number;
  orders: number;
  pendingOrders: number;
  customers: number;
  lowStock: number;
  revenue: number; // paise, delivered orders
}

export async function getAdminStats(
  db: DB,
  supplierId: string,
): Promise<AdminStats> {
  const [p] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${products.isActive})::int`,
    })
    .from(products)
    .where(eq(products.supplierId, supplierId));

  const [c] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(categories)
    .where(eq(categories.supplierId, supplierId));

  const [o] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${orders.status} not in ('delivered','cancelled'))::int`,
      revenue: sql<number>`coalesce(sum(${orders.totalAmount}) filter (where ${orders.status} = 'delivered'), 0)::int`,
    })
    .from(orders)
    .where(eq(orders.supplierId, supplierId));

  const [cust] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "customer"));

  const [low] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(inventory)
    .where(
      and(
        eq(inventory.supplierId, supplierId),
        sql`${inventory.quantityOnHand} - ${inventory.quantityReserved} <= ${inventory.lowStockThreshold}`,
      ),
    );

  return {
    products: p?.total ?? 0,
    activeProducts: p?.active ?? 0,
    categories: c?.total ?? 0,
    orders: o?.total ?? 0,
    pendingOrders: o?.pending ?? 0,
    customers: cust?.total ?? 0,
    lowStock: low?.total ?? 0,
    revenue: o?.revenue ?? 0,
  };
}

// ── products ────────────────────────────────────────────────────────────────

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  categoryName: string | null;
  price: number;
  stock: number;
  isActive: boolean;
}

export async function adminListProducts(
  db: DB,
  supplierId: string,
): Promise<AdminProductRow[]> {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      brand: products.brand,
      categoryName: categories.name,
      price: productVariants.price,
      isActive: products.isActive,
      stock: sql<number>`coalesce(${inventory.quantityOnHand} - ${inventory.quantityReserved}, 0)::int`,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(
      productVariants,
      and(
        eq(productVariants.productId, products.id),
        eq(productVariants.isDefault, true),
      ),
    )
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(eq(products.supplierId, supplierId))
    .orderBy(asc(products.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    brand: r.brand,
    categoryName: r.categoryName,
    price: r.price ?? 0,
    stock: r.stock,
    isActive: r.isActive,
  }));
}

// ── categories ──────────────────────────────────────────────────────────────

export interface AdminCategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export async function adminListCategories(
  db: DB,
  supplierId: string,
): Promise<AdminCategoryRow[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(eq(categories.supplierId, supplierId))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));
  return rows;
}

// ── orders ──────────────────────────────────────────────────────────────────

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethodValue;
  paymentStatus: string;
  totalAmount: number;
  customerName: string | null;
  customerPhone: string;
  placedAt: Date;
}

export async function adminListOrders(
  db: DB,
  supplierId: string,
  limit = 100,
): Promise<AdminOrderRow[]> {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      totalAmount: orders.totalAmount,
      customerName: users.name,
      customerPhone: users.phone,
      placedAt: orders.placedAt,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.supplierId, supplierId))
    .orderBy(desc(orders.placedAt))
    .limit(limit);
}

export interface AdminOrderDetail extends AdminOrderRow {
  customerId: string;
  subtotal: number;
  deliveryFee: number;
  savingsTotal: number;
  deliveryAddress: unknown;
  items: {
    id: string;
    productName: string;
    variantLabel: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  history: {
    status: OrderStatus;
    note: string | null;
    actor: string;
    createdAt: Date;
  }[];
}

export async function adminGetOrderById(
  db: DB,
  orderId: string,
): Promise<AdminOrderDetail | null> {
  const [o] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      totalAmount: orders.totalAmount,
      subtotal: orders.subtotal,
      deliveryFee: orders.deliveryFee,
      savingsTotal: orders.savingsTotal,
      deliveryAddress: orders.deliveryAddress,
      placedAt: orders.placedAt,
      customerId: users.id,
      customerName: users.name,
      customerPhone: users.phone,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!o) return null;

  const items = await db
    .select({
      id: orderItems.id,
      productName: orderItems.productName,
      variantLabel: orderItems.variantLabel,
      unitPrice: orderItems.unitPrice,
      quantity: orderItems.quantity,
      lineTotal: orderItems.lineTotal,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(orderItems.createdAt);

  const history = await db
    .select({
      status: orderStatusHistory.status,
      note: orderStatusHistory.note,
      actor: orderStatusHistory.actor,
      createdAt: orderStatusHistory.createdAt,
    })
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(orderStatusHistory.createdAt);

  return { ...o, items, history };
}

// ── customers ───────────────────────────────────────────────────────────────

export interface AdminCustomerRow {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  isBlocked: boolean;
  orderCount: number;
  joinedAt: Date;
}

export async function adminListCustomers(
  db: DB,
  limit = 200,
): Promise<AdminCustomerRow[]> {
  return db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
      isBlocked: users.isBlocked,
      orderCount: sql<number>`count(${orders.id})::int`,
      joinedAt: users.createdAt,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(eq(users.role, "customer"))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

// ── addresses ───────────────────────────────────────────────────────────────

export interface AdminAddressRow {
  id: string;
  label: string;
  house: string;
  area: string | null;
  city: string;
  pincode: string;
  customerName: string | null;
  customerPhone: string;
}

export async function adminListAddresses(
  db: DB,
  limit = 200,
): Promise<AdminAddressRow[]> {
  return db
    .select({
      id: addresses.id,
      label: addresses.label,
      house: addresses.house,
      area: addresses.area,
      city: addresses.city,
      pincode: addresses.pincode,
      customerName: users.name,
      customerPhone: users.phone,
    })
    .from(addresses)
    .innerJoin(users, eq(users.id, addresses.userId))
    .where(eq(addresses.isActive, true))
    .orderBy(desc(addresses.createdAt))
    .limit(limit);
}

// ── inventory ───────────────────────────────────────────────────────────────

export interface AdminInventoryRow {
  variantId: string;
  productName: string;
  variantLabel: string;
  onHand: number;
  reserved: number;
  available: number;
  threshold: number;
  low: boolean;
}

export async function adminListInventory(
  db: DB,
  supplierId: string,
): Promise<AdminInventoryRow[]> {
  const rows = await db
    .select({
      variantId: inventory.variantId,
      productName: products.name,
      variantLabel: productVariants.label,
      onHand: inventory.quantityOnHand,
      reserved: inventory.quantityReserved,
      threshold: inventory.lowStockThreshold,
    })
    .from(inventory)
    .innerJoin(productVariants, eq(productVariants.id, inventory.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(inventory.supplierId, supplierId))
    .orderBy(asc(products.name));

  return rows.map((r) => ({
    variantId: r.variantId,
    productName: r.productName,
    variantLabel: r.variantLabel,
    onHand: r.onHand,
    reserved: r.reserved,
    available: r.onHand - r.reserved,
    threshold: r.threshold,
    low: r.onHand - r.reserved <= r.threshold,
  }));
}

// ── settings ────────────────────────────────────────────────────────────────

export type StoreSettings = typeof storeSettings.$inferSelect;

export async function getStoreSettings(
  db: DB,
  supplierId: string,
): Promise<StoreSettings | null> {
  const [row] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.supplierId, supplierId))
    .limit(1);
  return row ?? null;
}
