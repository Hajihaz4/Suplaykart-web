/**
 * Order + inventory lifecycle verification against a real Postgres engine
 * (PGlite): create → reserve → oversell-prevention → status transitions →
 * deliver(sale+collected) → cancel(release) → ownership.
 *
 *   pnpm --filter @suplaykart/db verify:orders
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../src/schema";
import {
  categories,
  inventory,
  productVariants,
  products,
  suppliers,
  users,
} from "../src/schema";
import type { DB } from "../src/client";
import { createAddress } from "../src/dal/addresses";
import { addToCart } from "../src/dal/cart";
import { OutOfStockError } from "../src/dal/inventory";
import {
  InvalidTransitionError,
  cancelOrder,
  createOrder,
  getOrderById,
  listOrders,
  updateOrderStatus,
} from "../src/dal/orders";

const dir = path.dirname(fileURLToPath(import.meta.url));

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ✓", msg);
}

async function inv(db: DB, variantId: string) {
  const [r] = await db
    .select()
    .from(inventory)
    .where(eq(inventory.variantId, variantId));
  return {
    onHand: r!.quantityOnHand,
    reserved: r!.quantityReserved,
    available: r!.quantityOnHand - r!.quantityReserved,
  };
}

async function main() {
  const client = new PGlite();
  const db = drizzle(client, { schema, casing: "snake_case" }) as unknown as DB;
  await migrate(db as never, { migrationsFolder: path.join(dir, "../drizzle") });

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
      isVeg: true,
    })
    .returning();
  const [variant] = await db
    .insert(productVariants)
    .values({
      productId: prod!.id,
      label: "52 g",
      mrp: 6000,
      price: 5000,
      isDefault: true,
    })
    .returning();
  const V = variant!.id;
  await db
    .insert(inventory)
    .values({ variantId: V, supplierId: sup!.id, quantityOnHand: 10 });

  const [ua] = await db
    .insert(users)
    .values({ clerkUserId: "A", phone: "+919000000001", name: "A" })
    .returning();
  const [ub] = await db
    .insert(users)
    .values({ clerkUserId: "B", phone: "+919000000002", name: "B" })
    .returning();
  const A = ua!.id;
  const B = ub!.id;
  const addrA = await createAddress(db, A, {
    label: "home",
    house: "12 Main St",
    pincode: "611002",
    city: "Nagore",
    state: "TN",
  });
  const addrB = await createAddress(db, B, {
    label: "home",
    house: "9 Cross St",
    pincode: "611001",
    city: "Nagore",
    state: "TN",
  });

  console.log("→ create order (reserve-on-place)");
  await addToCart(db, A, V, 2);
  const order1 = await createOrder(db, A, {
    addressId: addrA.id,
    paymentMethod: "cod",
  });
  assert(order1.status === "placed", "order created as 'placed'");
  assert(order1.paymentStatus === "pending", "COD payment starts 'pending'");
  assert(order1.totalAmount === 5000 * 2 + 2500, "total = subtotal + delivery");
  assert(order1.orderNumber.startsWith("SP-"), "human order number assigned");
  let s = await inv(db, V);
  assert(s.reserved === 2 && s.available === 8, "2 units reserved (avail 8)");
  assert((await listOrders(db, A)).length === 1, "cart converted to 1 order");
  assert((await db.select().from(schema.cartItems)).length === 0, "cart emptied");

  console.log("→ oversell prevention (atomic, all-or-nothing)");
  await addToCart(db, B, V, 100);
  let threw = false;
  try {
    await createOrder(db, B, { addressId: addrB.id, paymentMethod: "cod" });
  } catch (e) {
    threw = e instanceof OutOfStockError;
  }
  assert(threw, "createOrder throws OutOfStockError when short");
  s = await inv(db, V);
  assert(s.reserved === 2, "failed order reserved nothing (rolled back)");
  assert((await listOrders(db, B)).length === 0, "no partial order persisted");

  console.log("→ status transitions + deliver (sale + collected)");
  for (const st of ["confirmed", "packed", "out_for_delivery", "delivered"] as const) {
    await updateOrderStatus(db, order1.id, st, { actor: "staff", note: st });
  }
  const delivered = await getOrderById(db, A, order1.id);
  assert(delivered!.status === "delivered", "reached 'delivered'");
  assert(delivered!.paymentStatus === "collected", "COD collected on delivery");
  assert(delivered!.history.length === 5, "5 timeline events recorded");
  s = await inv(db, V);
  assert(s.onHand === 8 && s.reserved === 0, "delivery commits sale (on_hand 8)");

  console.log("→ invalid transition rejected");
  let invalid = false;
  try {
    await updateOrderStatus(db, order1.id, "cancelled", { actor: "staff" });
  } catch (e) {
    invalid = e instanceof InvalidTransitionError;
  }
  assert(invalid, "delivered → cancelled is rejected");

  console.log("→ cancel releases reserved stock");
  await addToCart(db, A, V, 3);
  const order2 = await createOrder(db, A, {
    addressId: addrA.id,
    paymentMethod: "upi_on_delivery",
  });
  s = await inv(db, V);
  assert(s.reserved === 3 && s.available === 5, "order2 reserves 3 (avail 5)");
  const cancel = await cancelOrder(db, A, order2.id, "changed my mind");
  assert(cancel.ok === true, "customer cancel succeeds (within window)");
  s = await inv(db, V);
  assert(s.reserved === 0 && s.available === 8, "cancel releases the 3 units");

  console.log("→ ownership");
  const cancelByB = await cancelOrder(db, B, order2.id);
  assert(cancelByB.ok === false, "B cannot cancel A's order");
  assert((await getOrderById(db, B, order1.id)) === null, "B cannot read A's order");
  assert((await listOrders(db, A)).length === 2, "A sees both of their orders");

  console.log("\n✓ order + inventory lifecycle verified end-to-end");
  await client.close();
}

main().catch((e) => {
  console.error("✗ verification failed:", e);
  process.exit(1);
});
