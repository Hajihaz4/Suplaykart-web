"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  InvalidTransitionError,
  adjustInventory,
  adminSetOrderStatus,
  db,
  requireDefaultSupplier,
  setCategoryActive,
  setCustomerBlocked,
  setProductActive,
  type OrderStatus,
} from "@suplaykart/db";
import { requireAdmin } from "@/lib/auth";
import { notifyOrderEvent } from "@/lib/notify";

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
    await notifyOrderEvent(
      { id: order.id, userId: order.userId, orderNumber: order.orderNumber },
      status,
    );
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
  revalidateTag("products");
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
  revalidateTag("products");
  revalidatePath("/admin/products");
}

export async function toggleCategoryActiveAction(
  categoryId: string,
  active: boolean,
): Promise<void> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  await setCategoryActive(db, supplier.id, admin.id, categoryId, active);
  revalidateTag("categories");
  revalidatePath("/admin/categories");
}
