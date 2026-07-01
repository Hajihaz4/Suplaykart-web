"use server";
import { revalidatePath } from "next/cache";
import {
  addToCart,
  clearCart,
  db,
  removeFromCart,
  updateCartQuantity,
} from "@suplaykart/db";
import { requireCurrentUser } from "@/lib/auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CART_QTY = 99;

/** Sanitize a client-supplied quantity to a whole number in [1, MAX]. */
function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(MAX_CART_QTY, Math.max(1, Math.trunc(qty)));
}

export async function addToCartAction(
  variantId: string,
  qty = 1,
): Promise<void> {
  const user = await requireCurrentUser();
  if (!UUID_RE.test(variantId)) return;
  await addToCart(db, user.id, variantId, clampQty(qty));
  revalidatePath("/cart");
}

export async function updateCartQuantityAction(
  variantId: string,
  qty: number,
): Promise<void> {
  const user = await requireCurrentUser();
  if (!UUID_RE.test(variantId)) return;
  // qty <= 0 intentionally removes the line (handled in the DAL); otherwise clamp.
  const next = Number.isFinite(qty) && qty <= 0 ? 0 : clampQty(qty);
  await updateCartQuantity(db, user.id, variantId, next);
  revalidatePath("/cart");
}

export async function removeCartItemAction(variantId: string): Promise<void> {
  const user = await requireCurrentUser();
  if (!UUID_RE.test(variantId)) return;
  await removeFromCart(db, user.id, variantId);
  revalidatePath("/cart");
}

export async function clearCartAction(): Promise<void> {
  const user = await requireCurrentUser();
  await clearCart(db, user.id);
  revalidatePath("/cart");
}
