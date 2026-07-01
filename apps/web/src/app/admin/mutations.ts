"use server";
import { revalidatePath } from "next/cache";
import {
  InvalidTransitionError,
  adjustInventory,
  adminSetOrderStatus,
  createNotification,
  db,
  requireDefaultSupplier,
  setCategoryActive,
  setCustomerBlocked,
  setProductActive,
  type OrderStatus,
} from "@suplaykart/db";
import { requireAdmin } from "@/lib/auth";
import { pushToUsers } from "@/lib/push";

const STATUS_MESSAGE: Record<OrderStatus, string> = {
  placed: "placed",
  confirmed: "confirmed",
  packed: "packed and ready",
  out_for_delivery: "out for delivery",
  delivered: "delivered",
  cancelled: "cancelled",
};

async function notifyOrderStatus(
  userId: string,
  orderNumber: string,
  status: OrderStatus,
  orderId: string,
) {
  const phrase = STATUS_MESSAGE[status];
  const title = `Order ${orderNumber} ${phrase}`;
  const body =
    status === "delivered"
      ? "Your order has been delivered. Enjoy!"
      : status === "cancelled"
        ? "Your order was cancelled."
        : `Your order is now ${phrase}.`;
  await createNotification(db, {
    userId,
    type:
      status === "out_for_delivery" || status === "delivered"
        ? "delivery"
        : "order",
    title,
    body,
    data: { orderId },
  });
  await pushToUsers([userId], {
    title,
    body,
    url: `/account/orders/${orderId}`,
    tag: `order-${orderId}`,
  });
}

/**
 * Non-validated admin mutations (toggles / status / adjust / block).
 *
 * IMPORTANT: this module must NOT import zod. It is consumed by BOTH Server
 * Component pages (products/categories toggles) and client components
 * (inventory/customers/orders). Keeping zod out of the shared module avoids the
 * Next dev vendor-chunk emission bug (`ENOENT vendor-chunks/zod@…`) that a
 * zod-importing module dual-consumed across the RSC↔client boundary triggers.
 * All input-validating (zod) actions live in `./actions.ts`, consumed only by
 * client form components.
 */

export async function setOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const admin = await requireAdmin();
  try {
    const order = await adminSetOrderStatus(db, admin.id, orderId, status);
    await notifyOrderStatus(order.userId, order.orderNumber, status, orderId);
  } catch (e) {
    if (!(e instanceof InvalidTransitionError)) throw e;
  }
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function adjustInventoryAction(
  variantId: string,
  delta: number,
  reason?: string,
): Promise<void> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  await adjustInventory(db, supplier.id, admin.id, variantId, delta, reason);
  revalidatePath("/admin/inventory");
}

export async function toggleCustomerBlockAction(
  userId: string,
  blocked: boolean,
): Promise<void> {
  const admin = await requireAdmin();
  await setCustomerBlocked(db, admin.id, userId, blocked);
  revalidatePath("/admin/customers");
}

export async function toggleProductActiveAction(
  productId: string,
  active: boolean,
): Promise<void> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  await setProductActive(db, supplier.id, admin.id, productId, active);
  revalidatePath("/admin/products");
}

export async function toggleCategoryActiveAction(
  categoryId: string,
  active: boolean,
): Promise<void> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  await setCategoryActive(db, supplier.id, admin.id, categoryId, active);
  revalidatePath("/admin/categories");
}
