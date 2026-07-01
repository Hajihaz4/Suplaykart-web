import "server-only";
import { createNotification, db } from "@suplaykart/db";
import type { OrderStatus } from "@suplaykart/db";
import { pushToUsers } from "./push";
import { logger } from "./logger";

/**
 * Central event-driven notification dispatch. Every order/delivery event flows
 * through here so the in-feed notification, push send, retry, and dead-endpoint
 * cleanup happen in one place. Failures are logged, never thrown (a
 * notification must never break the order flow).
 */

const STATUS_MESSAGE: Record<OrderStatus, string> = {
  placed: "placed",
  confirmed: "confirmed",
  packed: "packed and ready",
  out_for_delivery: "out for delivery",
  delivered: "delivered",
  cancelled: "cancelled",
};

interface OrderRef {
  id: string;
  userId: string;
  orderNumber: string;
}

export async function notifyOrderEvent(
  order: OrderRef,
  status: OrderStatus,
): Promise<void> {
  const phrase = STATUS_MESSAGE[status];
  const title = `Order ${order.orderNumber} ${phrase}`;
  const body =
    status === "delivered"
      ? "Your order has been delivered. Enjoy!"
      : status === "cancelled"
        ? "Your order was cancelled."
        : status === "placed"
          ? "We've received your order and will keep you posted."
          : `Your order is now ${phrase}.`;
  try {
    await createNotification(db, {
      userId: order.userId,
      type:
        status === "out_for_delivery" || status === "delivered"
          ? "delivery"
          : "order",
      title,
      body,
      data: { orderId: order.id },
    });
    const res = await pushToUsers([order.userId], {
      title,
      body,
      url: `/account/orders/${order.id}`,
      tag: `order-${order.id}`,
    });
    logger.info("notify.order", {
      orderId: order.id,
      status,
      pushSent: res.sent,
      pruned: res.pruned,
    });
  } catch (e) {
    logger.error("notify.order_failed", {
      orderId: order.id,
      status,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
