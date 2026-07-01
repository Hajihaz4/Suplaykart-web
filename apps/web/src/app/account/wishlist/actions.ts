"use server";
import { revalidatePath } from "next/cache";
import {
  addToWishlist,
  db,
  isInWishlist,
  removeFromWishlist,
} from "@suplaykart/db";
import { requireCurrentUser } from "@/lib/auth";

export async function toggleWishlistAction(
  variantId: string,
): Promise<{ wishlisted: boolean }> {
  const user = await requireCurrentUser();
  const has = await isInWishlist(db, user.id, variantId);
  if (has) await removeFromWishlist(db, user.id, variantId);
  else await addToWishlist(db, user.id, variantId);
  revalidatePath("/account/wishlist");
  return { wishlisted: !has };
}
