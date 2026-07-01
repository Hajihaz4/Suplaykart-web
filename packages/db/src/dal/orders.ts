import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import type { DB } from "../client";
import {
  addresses,
  cartItems,
  carts,
  orderItems,
  orderStatusHistory,
  orders,
  productVariants,
  products,
} from "../schema";
import { commitSale, releaseStock, reserveStock } from "./inventory";
import { createPaymentRecord, setPaymentStatus } from "./payments";

// ── domain types ────────────────────────────────────────────────────────────

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentMethodValue = "cod" | "upi_on_delivery";
export type ActorType = "system" | "customer" | "staff";

export type Order = typeof orders.$inferSelect;

export interface CreateOrderInput {
  addressId: string;
  paymentMethod: PaymentMethodValue;
  deliveryInstructions?: string | null;
}

export interface AddressSnapshot {
  label: string;
  customLabel: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  house: string;
  floor: string | null;
  area: string | null;
  landmark: string | null;
  pincode: string;
  city: string;
  state: string;
}

export interface OrderItemView {
  id: string;
  variantId: string | null;
  productName: string;
  variantLabel: string;
  isVeg: boolean | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  note: string | null;
  actor: ActorType;
  createdAt: Date;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethodValue;
  paymentStatus: string;
  totalAmount: number;
  itemCount: number;
  firstItemName: string;
  extraLines: number;
  placedAt: Date;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethodValue;
  paymentStatus: string;
  subtotal: number;
  savingsTotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryAddress: AddressSnapshot;
  deliveryInstructions: string | null;
  placedAt: Date;
  cancelReason: string | null;
  items: OrderItemView[];
  history: OrderStatusEvent[];
  cancellable: boolean;
}

// ── errors ──────────────────────────────────────────────────────────────────

export class EmptyCartError extends Error {
  constructor() {
    super("Cart is empty");
    this.name = "EmptyCartError";
  }
}
export class AddressNotFoundError extends Error {
  constructor() {
    super("Delivery address not found");
    this.name = "AddressNotFoundError";
  }
}
export class OrderNotFoundError extends Error {
  constructor() {
    super("Order not found");
    this.name = "OrderNotFoundError";
  }
}
export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot move order from ${from} to ${to}`);
    this.name = "InvalidTransitionError";
  }
}

// ── state machine (§4) ──────────────────────────────────────────────────────

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
export function isCancellable(status: OrderStatus): boolean {
  return TRANSITIONS[status].includes("cancelled");
}

// ── pricing ─────────────────────────────────────────────────────────────────

const DELIVERY_FEE = 2500; // paise
const FREE_DELIVERY_MIN = 20000; // paise

export function deliveryFeeFor(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
}

function genOrderNumber(): string {
  return "SP-" + randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

function snapshotAddress(a: typeof addresses.$inferSelect): AddressSnapshot {
  return {
    label: a.label,
    customLabel: a.customLabel,
    recipientName: a.recipientName,
    recipientPhone: a.recipientPhone,
    house: a.house,
    floor: a.floor,
    area: a.area,
    landmark: a.landmark,
    pincode: a.pincode,
    city: a.city,
    state: a.state,
  };
}

// ── create (transactional, reserve-all-or-fail) ─────────────────────────────

export async function createOrder(
  db: DB,
  userId: string,
  input: CreateOrderInput,
): Promise<Order> {
  return db.transaction(async (tx) => {
    const lines = await tx
      .select({
        variantId: productVariants.id,
        supplierId: products.supplierId,
        name: products.name,
        isVeg: products.isVeg,
        label: productVariants.label,
        price: productVariants.price,
        mrp: productVariants.mrp,
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .innerJoin(carts, eq(carts.id, cartItems.cartId))
      .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(carts.userId, userId));

    if (lines.length === 0) throw new EmptyCartError();
    const supplierId = lines[0]!.supplierId;

    const [addr] = await tx
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.id, input.addressId),
          eq(addresses.userId, userId),
          eq(addresses.isActive, true),
        ),
      )
      .limit(1);
    if (!addr) throw new AddressNotFoundError();

    const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
    const savings = lines.reduce(
      (n, l) => n + Math.max(0, l.mrp - l.price) * l.quantity,
      0,
    );
    const deliveryFee = deliveryFeeFor(subtotal);
    const totalAmount = subtotal + deliveryFee;

    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber: genOrderNumber(),
        userId,
        supplierId,
        paymentMethod: input.paymentMethod,
        deliveryAddress: snapshotAddress(addr),
        addressId: addr.id,
        subtotal,
        savingsTotal: savings,
        deliveryFee,
        totalAmount,
        deliveryInstructions: input.deliveryInstructions
          ? { note: input.deliveryInstructions }
          : null,
      })
      .returning();

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId: order!.id,
        variantId: l.variantId,
        productName: l.name,
        variantLabel: l.label,
        isVeg: l.isVeg,
        unitPrice: l.price,
        quantity: l.quantity,
        lineTotal: l.price * l.quantity,
      })),
    );

    // reserve stock — throws OutOfStockError → whole transaction rolls back
    for (const l of lines) {
      await reserveStock(tx, supplierId, l.variantId, l.quantity, order!.id);
    }

    await tx.insert(orderStatusHistory).values({
      orderId: order!.id,
      status: "placed",
      actor: "customer",
      actorUserId: userId,
      note: "Order placed",
    });

    // payment record (pending; collected on delivery for COD/UPI-on-delivery)
    await createPaymentRecord(tx, {
      orderId: order!.id,
      provider: input.paymentMethod,
      amount: totalAmount,
      status: "pending",
    });

    // empty the cart
    const [cart] = await tx
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);
    if (cart) await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    return order!;
  });
}

// ── status transitions (shared by admin + customer cancel) ──────────────────

interface ApplyOpts {
  actor: ActorType;
  actorUserId?: string | null;
  note?: string | null;
  reason?: string | null;
}

async function applyStatusTx(
  tx: Parameters<Parameters<DB["transaction"]>[0]>[0],
  order: Order,
  to: OrderStatus,
  opts: ApplyOpts,
): Promise<void> {
  const now = new Date();
  const set: Partial<typeof orders.$inferInsert> = { status: to };
  if (to === "confirmed") set.confirmedAt = now;
  if (to === "packed") set.packedAt = now;
  if (to === "out_for_delivery") set.outForDeliveryAt = now;
  if (to === "delivered") {
    set.deliveredAt = now;
    set.paymentStatus = "collected"; // COD collected on delivery
  }
  if (to === "cancelled") {
    set.cancelledAt = now;
    set.cancelReason = opts.reason ?? null;
    set.cancelledBy = opts.actor;
  }
  await tx.update(orders).set(set).where(eq(orders.id, order.id));

  if (to === "delivered" || to === "cancelled") {
    const items = await tx
      .select({
        variantId: orderItems.variantId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    for (const it of items) {
      if (!it.variantId) continue;
      if (to === "delivered") {
        await commitSale(tx, order.supplierId, it.variantId, it.quantity, order.id);
      } else {
        await releaseStock(tx, order.supplierId, it.variantId, it.quantity, order.id);
      }
    }
    // payment lifecycle mirrors the order outcome
    await setPaymentStatus(tx, order.id, to === "delivered" ? "collected" : "failed");
  }

  await tx.insert(orderStatusHistory).values({
    orderId: order.id,
    status: to,
    actor: opts.actor,
    actorUserId: opts.actorUserId ?? null,
    note: opts.note ?? null,
  });
}

/** Admin/system transition; validates the state machine, applies inventory. */
export async function updateOrderStatus(
  db: DB,
  orderId: string,
  to: OrderStatus,
  opts: ApplyOpts,
): Promise<Order> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) throw new OrderNotFoundError();
    if (!canTransition(order.status, to)) {
      throw new InvalidTransitionError(order.status, to);
    }
    await applyStatusTx(tx, order, to, opts);
    const [updated] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    return updated!;
  });
}

export type CancelResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "not_cancellable" };

/** Customer cancel — ownership-enforced, only within the cancellable window. */
export async function cancelOrder(
  db: DB,
  userId: string,
  orderId: string,
  reason?: string,
): Promise<CancelResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);
    if (!order) return { ok: false, error: "not_found" };
    if (!canTransition(order.status, "cancelled")) {
      return { ok: false, error: "not_cancellable" };
    }
    await applyStatusTx(tx, order, "cancelled", {
      actor: "customer",
      actorUserId: userId,
      reason: reason ?? "Cancelled by customer",
      note: "Cancelled by customer",
    });
    return { ok: true };
  });
}

// ── reads ───────────────────────────────────────────────────────────────────

export interface OrderFilter {
  status?: OrderStatus;
  q?: string;
}

export async function listOrders(
  db: DB,
  userId: string,
  filter: OrderFilter = {},
): Promise<OrderSummary[]> {
  const conds = [eq(orders.userId, userId)];
  if (filter.status) conds.push(eq(orders.status, filter.status));
  if (filter.q?.trim())
    conds.push(ilike(orders.orderNumber, `%${filter.q.trim()}%`));

  const orderRows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      totalAmount: orders.totalAmount,
      placedAt: orders.placedAt,
    })
    .from(orders)
    .where(and(...conds))
    .orderBy(desc(orders.placedAt));
  if (orderRows.length === 0) return [];

  const ids = orderRows.map((o) => o.id);
  const items = await db
    .select({
      orderId: orderItems.orderId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, ids));

  const byOrder = new Map<
    string,
    { count: number; lines: number; first: string }
  >();
  for (const it of items) {
    const cur = byOrder.get(it.orderId) ?? { count: 0, lines: 0, first: "" };
    cur.count += it.quantity;
    cur.lines += 1;
    if (!cur.first) cur.first = it.productName;
    byOrder.set(it.orderId, cur);
  }

  return orderRows.map((o) => {
    const agg = byOrder.get(o.id) ?? { count: 0, lines: 0, first: "Order" };
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      totalAmount: o.totalAmount,
      itemCount: agg.count,
      firstItemName: agg.first,
      extraLines: Math.max(0, agg.lines - 1),
      placedAt: o.placedAt,
    } satisfies OrderSummary;
  });
}

export async function getOrderById(
  db: DB,
  userId: string,
  orderId: string,
): Promise<OrderDetail | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  if (!order) return null;

  const items = await db
    .select()
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

  const instr = order.deliveryInstructions as { note?: string } | null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    savingsTotal: order.savingsTotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    deliveryAddress: order.deliveryAddress as AddressSnapshot,
    deliveryInstructions: instr?.note ?? null,
    placedAt: order.placedAt,
    cancelReason: order.cancelReason,
    items: items.map((it) => ({
      id: it.id,
      variantId: it.variantId,
      productName: it.productName,
      variantLabel: it.variantLabel,
      isVeg: it.isVeg,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      lineTotal: it.lineTotal,
    })),
    history: history.map((h) => ({
      status: h.status,
      note: h.note,
      actor: h.actor,
      createdAt: h.createdAt,
    })),
    cancellable: isCancellable(order.status),
  };
}
