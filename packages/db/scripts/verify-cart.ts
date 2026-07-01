/**
 * Cart DAL lifecycle verification (add → increment → update → remove → clear →
 * count → per-user isolation → persistence) against a real Postgres engine
 * (PGlite).
 *
 *   pnpm --filter @suplaykart/db verify:cart
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/schema";
import {
  categories,
  productVariants,
  products,
  suppliers,
  users,
} from "../src/schema";
import type { DB } from "../src/client";
import {
  addToCart,
  clearCart,
  getCartCount,
  getCartItems,
  getCartView,
  removeFromCart,
  updateCartQuantity,
} from "../src/dal/cart";

const dir = path.dirname(fileURLToPath(import.meta.url));

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ✓", msg);
}

async function main() {
  const client = new PGlite();
  const db = drizzle(client, {
    schema,
    casing: "snake_case",
  }) as unknown as DB;
  await migrate(db as never, {
    migrationsFolder: path.join(dir, "../drizzle"),
  });

  // ── seed a minimal catalog ────────────────────────────────────────────
  const [sup] = await db
    .insert(suppliers)
    .values({ name: "Suplaykart Store", isDefault: true })
    .returning();
  const [cat] = await db
    .insert(categories)
    .values({ supplierId: sup!.id, name: "Snacks", slug: "snacks" })
    .returning();
  const [prod] = await db
    .insert(products)
    .values({
      supplierId: sup!.id,
      categoryId: cat!.id,
      name: "Test Chips",
      slug: "test-chips",
    })
    .returning();
  const [v1] = await db
    .insert(productVariants)
    .values({
      productId: prod!.id,
      label: "52 g",
      mrp: 6000,
      price: 5000,
      isDefault: true,
    })
    .returning();
  const [v2] = await db
    .insert(productVariants)
    .values({ productId: prod!.id, label: "90 g", mrp: 10000, price: 10000 })
    .returning();

  const [ua] = await db
    .insert(users)
    .values({ clerkUserId: "clerk_A", phone: "+919000000001", name: "User A" })
    .returning();
  const [ub] = await db
    .insert(users)
    .values({ clerkUserId: "clerk_B", phone: "+919000000002", name: "User B" })
    .returning();
  const A = ua!.id;
  const B = ub!.id;

  console.log("→ add to cart");
  await addToCart(db, A, v1!.id, 1);
  let items = await getCartItems(db, A);
  assert(items.length === 1 && items[0]!.quantity === 1, "item added (qty 1)");

  await addToCart(db, A, v1!.id, 1);
  items = await getCartItems(db, A);
  assert(
    items.length === 1 && items[0]!.quantity === 2,
    "re-add same variant increments (qty 2)",
  );

  await addToCart(db, A, v2!.id, 3);
  items = await getCartItems(db, A);
  assert(items.length === 2, "second variant is a new line");

  console.log("→ count + totals");
  assert((await getCartCount(db, A)) === 5, "cart count = 5 (2 + 3)");
  const view = await getCartView(db, A);
  assert(
    view.subtotal === 5000 * 2 + 10000 * 3,
    "subtotal = Σ price × qty (paise)",
  );
  assert(view.itemCount === 5, "view itemCount = 5");
  assert(view.savings === (6000 - 5000) * 2, "savings from v1 MRP gap");

  console.log("→ update quantity");
  await updateCartQuantity(db, A, v1!.id, 5);
  items = await getCartItems(db, A);
  assert(
    items.find((i) => i.variantId === v1!.id)!.quantity === 5,
    "v1 quantity set to 5",
  );

  console.log("→ update to 0 removes line");
  await updateCartQuantity(db, A, v2!.id, 0);
  items = await getCartItems(db, A);
  assert(
    !items.some((i) => i.variantId === v2!.id),
    "setting qty 0 removes the line",
  );

  console.log("→ per-user isolation");
  await addToCart(db, B, v2!.id, 1);
  assert((await getCartCount(db, A)) === 5, "user A cart unaffected by B");
  assert((await getCartCount(db, B)) === 1, "user B has an independent cart");

  console.log("→ remove + clear");
  await removeFromCart(db, A, v1!.id);
  assert((await getCartCount(db, A)) === 0, "removeFromCart empties A");
  await addToCart(db, A, v1!.id, 2);
  await clearCart(db, A);
  assert((await getCartCount(db, A)) === 0, "clearCart empties A");
  assert((await getCartCount(db, B)) === 1, "clearCart(A) leaves B intact");

  console.log("\n✓ cart lifecycle + isolation verified end-to-end");
  await client.close();
}

main().catch((e) => {
  console.error("✗ verification failed:", e);
  process.exit(1);
});
