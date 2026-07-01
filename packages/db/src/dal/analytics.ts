import { and, eq, sql } from "drizzle-orm";
import type { DB } from "../client";
import {
  cartItems,
  carts,
  inventory,
  orderItems,
  orders,
  users,
} from "../schema";

export interface RevenuePoint {
  day: string;
  revenue: number;
  orders: number;
}

/** Daily revenue + order count over the last `days` days. */
export async function getRevenueByDay(
  db: DB,
  supplierId: string,
  days = 14,
): Promise<RevenuePoint[]> {
  return db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.placedAt}), 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${orders.totalAmount}) filter (where ${orders.status} = 'delivered'), 0)::int`,
      orders: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.supplierId, supplierId),
        sql`${orders.placedAt} >= now() - (${days} || ' days')::interval`,
      ),
    )
    .groupBy(sql`date_trunc('day', ${orders.placedAt})`)
    .orderBy(sql`date_trunc('day', ${orders.placedAt})`);
}

export interface StatusBreakdown {
  status: string;
  count: number;
}

export async function getOrderStatusBreakdown(
  db: DB,
  supplierId: string,
): Promise<StatusBreakdown[]> {
  return db
    .select({
      status: orders.status,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(eq(orders.supplierId, supplierId))
    .groupBy(orders.status);
}

export interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

export async function getTopProducts(
  db: DB,
  supplierId: string,
  limit = 8,
): Promise<TopProduct[]> {
  return db
    .select({
      name: orderItems.productName,
      qty: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`sum(${orderItems.lineTotal})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(orders.supplierId, supplierId))
    .groupBy(orderItems.productName)
    .orderBy(sql`sum(${orderItems.quantity}) desc`)
    .limit(limit);
}

export interface CustomerAnalytics {
  total: number;
  newLast30d: number;
  repeat: number;
}

export async function getCustomerAnalytics(
  db: DB,
): Promise<CustomerAnalytics> {
  const [total] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "customer"));
  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        eq(users.role, "customer"),
        sql`${users.createdAt} >= now() - interval '30 days'`,
      ),
    );
  const repeatRows = await db
    .select({ userId: orders.userId })
    .from(orders)
    .groupBy(orders.userId)
    .having(sql`count(*) > 1`);
  return {
    total: total?.n ?? 0,
    newLast30d: recent?.n ?? 0,
    repeat: repeatRows.length,
  };
}

export interface OperationalMetrics {
  avgOrderValue: number; // paise
  avgItemsPerOrder: number;
  pendingOrders: number;
  lowStock: number;
}

export async function getOperationalMetrics(
  db: DB,
  supplierId: string,
): Promise<OperationalMetrics> {
  const [o] = await db
    .select({
      aov: sql<number>`coalesce(round(avg(${orders.totalAmount})), 0)::int`,
      pending: sql<number>`count(*) filter (where ${orders.status} not in ('delivered','cancelled'))::int`,
    })
    .from(orders)
    .where(eq(orders.supplierId, supplierId));
  const [items] = await db
    .select({
      avgItems: sql<number>`coalesce(round(avg(cnt), 1), 0)::float`,
    })
    .from(
      db
        .select({
          orderId: orderItems.orderId,
          cnt: sql<number>`sum(${orderItems.quantity})`.as("cnt"),
        })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(eq(orders.supplierId, supplierId))
        .groupBy(orderItems.orderId)
        .as("per_order"),
    );
  const [low] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(inventory)
    .where(
      and(
        eq(inventory.supplierId, supplierId),
        sql`${inventory.quantityOnHand} - ${inventory.quantityReserved} <= ${inventory.lowStockThreshold}`,
      ),
    );
  return {
    avgOrderValue: o?.aov ?? 0,
    avgItemsPerOrder: items?.avgItems ?? 0,
    pendingOrders: o?.pending ?? 0,
    lowStock: low?.n ?? 0,
  };
}

export interface ConversionMetrics {
  activeCarts: number;
  orders: number;
  fulfillmentRate: number; // delivered / (delivered + cancelled)
  cancellationRate: number;
}

export async function getConversionMetrics(
  db: DB,
  supplierId: string,
): Promise<ConversionMetrics> {
  const [carts_] = await db
    .select({ n: sql<number>`count(distinct ${cartItems.cartId})::int` })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId));
  const [o] = await db
    .select({
      total: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${orders.status} = 'delivered')::int`,
      cancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')::int`,
    })
    .from(orders)
    .where(eq(orders.supplierId, supplierId));
  const finished = (o?.delivered ?? 0) + (o?.cancelled ?? 0);
  return {
    activeCarts: carts_?.n ?? 0,
    orders: o?.total ?? 0,
    fulfillmentRate: finished ? (o!.delivered / finished) * 100 : 0,
    cancellationRate: o?.total ? ((o.cancelled ?? 0) / o.total) * 100 : 0,
  };
}
