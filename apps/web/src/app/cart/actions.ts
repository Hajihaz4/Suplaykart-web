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

export async function addToCartAction(
  variantId: string,
  qty = 1,
): Promise<void> {
  const user = await requireCurrentUser();
  await addToCart(db, user.id, variantId, qty);
  revalidatePath("/cart");
}

export async function updateCartQuantityAction(
  variantId: string,
  qty: number,
): Promise<void> {
  const user = await requireCurrentUser();
  await updateCartQuantity(db, user.id, variantId, qty);
  revalidatePath("/cart");
}

export async function removeCartItemAction(variantId: string): Promise<void> {
  const user = await requireCurrentUser();
  await removeFromCart(db, user.id, variantId);
  revalidatePath("/cart");
}

export async function clearCartAction(): Promise<void> {
  const user = await requireCurrentUser();
  await clearCart(db, user.id);
  revalidatePath("/cart");
}
