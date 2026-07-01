import "server-only";
import { db, getCartItems } from "@suplaykart/db";
import { getCurrentUser } from "./auth";

export interface CurrentCart {
  count: number;
  quantities: Record<string, number>;
}

/**
 * Cart badge count + per-variant quantities for the current user.
 * Guests get an empty cart (count 0) so public pages stay renderable.
 */
export async function currentCart(): Promise<CurrentCart> {
  const user = await getCurrentUser();
  if (!user) return { count: 0, quantities: {} };
  const items = await getCartItems(db, user.id);
  const quantities: Record<string, number> = {};
  let count = 0;
  for (const it of items) {
    quantities[it.variantId] = it.quantity;
    count += it.quantity;
  }
  return { count, quantities };
}
