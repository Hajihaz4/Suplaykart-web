import "server-only";
import { db, listWishlistedVariantIds } from "@suplaykart/db";
import { getCurrentUser } from "./auth";

/** Current user's wishlisted variant ids (empty for guests). */
export async function currentWishlist(): Promise<{
  ids: Set<string>;
  authed: boolean;
}> {
  const user = await getCurrentUser();
  if (!user) return { ids: new Set(), authed: false };
  return {
    ids: new Set(await listWishlistedVariantIds(db, user.id)),
    authed: true,
  };
}
