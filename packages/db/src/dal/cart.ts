import { and, eq, sql } from "drizzle-orm";
import type { DB } from "../client";
import { cartItems, carts, productVariants, products } from "../schema";
import type { CartItemView, CartView } from "./types";

/** Get the user's cart id, creating the cart if it doesn't exist. */
async function getOrCreateCartId(db: DB, userId: string): Promise<string> {
  const existing = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const inserted = await db
    .insert(carts)
    .values({ userId })
    .onConflictDoNothing()
    .returning({ id: carts.id });
  if (inserted[0]) return inserted[0].id;

  const again = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);
  return again[0]!.id;
}

export async function getCart(db: DB, userId: string): Promise<{ id: string }> {
  return { id: await getOrCreateCartId(db, userId) };
}

export async function getCartItems(
  db: DB,
  userId: string,
): Promise<CartItemView[]> {
  const rows = await db
    .select({
      variantId: productVariants.id,
      productId: products.id,
      slug: products.slug,
      name: products.name,
      attributes: products.attributes,
      isVeg: products.isVeg,
      unit: productVariants.label,
      price: productVariants.price,
      mrp: productVariants.mrp,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(carts.userId, userId))
    .orderBy(cartItems.addedAt);

  return rows.map((r) => {
    const attrs = (r.attributes ?? {}) as { emoji?: string };
    return {
      variantId: r.variantId,
      productId: r.productId,
      slug: r.slug,
      name: r.name,
      unit: r.unit,
      image: attrs.emoji ?? "📦",
      price: r.price,
      mrp: r.mrp > r.price ? r.mrp : null,
      veg: r.isVeg,
      quantity: r.quantity,
      lineTotal: r.price * r.quantity,
    } satisfies CartItemView;
  });
}

/** Total item quantity for the cart badge. */
export async function getCartCount(db: DB, userId: string): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int`,
    })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .where(eq(carts.userId, userId));
  return rows[0]?.total ?? 0;
}

export async function getCartView(db: DB, userId: string): Promise<CartView> {
  const items = await getCartItems(db, userId);
  const subtotal = items.reduce((n, i) => n + i.lineTotal, 0);
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const savings = items.reduce(
    (n, i) => n + (i.mrp ? (i.mrp - i.price) * i.quantity : 0),
    0,
  );
  return { items, subtotal, itemCount, savings };
}

export async function addToCart(
  db: DB,
  userId: string,
  variantId: string,
  qty = 1,
): Promise<void> {
  const cartId = await getOrCreateCartId(db, userId);
  await db
    .insert(cartItems)
    .values({ cartId, variantId, quantity: qty })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.variantId],
      set: { quantity: sql`${cartItems.quantity} + ${qty}` },
    });
}

export async function updateCartQuantity(
  db: DB,
  userId: string,
  variantId: string,
  qty: number,
): Promise<void> {
  const cartId = await getOrCreateCartId(db, userId);
  if (qty <= 0) {
    await db
      .delete(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)),
      );
    return;
  }
  await db
    .update(cartItems)
    .set({ quantity: qty })
    .where(
      and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)),
    );
}

export async function removeFromCart(
  db: DB,
  userId: string,
  variantId: string,
): Promise<void> {
  const cartId = await getOrCreateCartId(db, userId);
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)));
}

export async function clearCart(db: DB, userId: string): Promise<void> {
  const cartId = await getOrCreateCartId(db, userId);
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}
