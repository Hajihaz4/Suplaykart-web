/**
 * Admin operations verification (PGlite): product CRUD, category CRUD,
 * inventory adjustment (+ below-reserved guard), order status management,
 * customer block, store settings upsert, and audit logging.
 *
 *   pnpm --filter @suplaykart/db verify:admin
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq } from "drizzle-orm";
import * as schema from "../src/schema";
import { categories, inventory, productVariants, products, suppliers, users } from "../src/schema";
import type { DB } from "../src/client";
import { createAddress } from "../src/dal/addresses";
import { addToCart } from "../src/dal/cart";
import { createOrder } from "../src/dal/orders";
import {
  adjustInventory,
  adminSetOrderStatus,
  createCategory,
  createProduct,
  getProductForEdit,
  listAuditLog,
  setCategoryActive,
  setCustomerBlocked,
  setProductActive,
  updateCategory,
  updateProduct,
  upsertStoreSettings,
} from "../src/dal/admin-ops";

const dir = path.dirname(fileURLToPath(import.meta.url));
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ✓", msg);
}
async function variantOf(db: DB, productId: string) {
  const [v] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(and(eq(productVariants.productId, productId), eq(productVariants.isDefault, true)));
  return v!.id;
}

async function main() {
  const client = new PGlite();
  const db = drizzle(client, { schema, casing: "snake_case" }) as unknown as DB;
  await migrate(db as never, { migrationsFolder: path.join(dir, "../drizzle") });

  const [sup] = await db.insert(suppliers).values({ name: "Store", isDefault: true }).returning();
  const [cat0] = await db
    .insert(categories)
    .values({ supplierId: sup!.id, name: "Snacks", slug: "snacks" })
    .returning();
  const [admin] = await db
    .insert(users)
    .values({ clerkUserId: "adm", phone: "+910000000000", name: "Admin", role: "owner" })
    .returning();
  const [cust] = await db
    .insert(users)
    .values({ clerkUserId: "cus", phone: "+919000000001", name: "Cust" })
    .returning();
  const S = sup!.id;
  const ADM = admin!.id;

  console.log("→ product CRUD");
  const pid = await createProduct(db, S, ADM, {
    name: "Chips",
    slug: "chips",
    categoryId: cat0!.id,
    price: 5000,
    mrp: 6000,
    unit: "50 g",
    emoji: "🥔",
    initialStock: 20,
  });
  const V = await variantOf(db, pid);
  const [invRow] = await db.select().from(inventory).where(eq(inventory.variantId, V));
  assert(!!pid && invRow!.quantityOnHand === 20, "createProduct makes product+variant+stock");
  const edit = await getProductForEdit(db, S, pid);
  assert(edit?.price === 5000 && edit?.emoji === "🥔", "getProductForEdit returns fields");
  await updateProduct(db, S, ADM, pid, {
    name: "Chips XL",
    categoryId: cat0!.id,
    price: 5500,
    unit: "90 g",
  });
  const edit2 = await getProductForEdit(db, S, pid);
  assert(edit2?.name === "Chips XL" && edit2?.price === 5500, "updateProduct updates product+variant");
  await setProductActive(db, S, ADM, pid, false);
  const [pRow] = await db.select().from(products).where(eq(products.id, pid));
  assert(pRow!.isActive === false, "setProductActive hides product");
  await setProductActive(db, S, ADM, pid, true);

  console.log("→ category CRUD");
  const cid = await createCategory(db, S, ADM, { name: "Drinks", slug: "drinks", icon: "🥤", sortOrder: 2 });
  await updateCategory(db, S, ADM, cid, { name: "Cold Drinks", slug: "drinks", sortOrder: 3 });
  const [cRow] = await db.select().from(categories).where(eq(categories.id, cid));
  assert(cRow!.name === "Cold Drinks" && cRow!.sortOrder === 3, "category create+update");
  await setCategoryActive(db, S, ADM, cid, false);
  const [cRow2] = await db.select().from(categories).where(eq(categories.id, cid));
  assert(cRow2!.isActive === false, "setCategoryActive hides category");

  console.log("→ inventory adjustment (+ guard)");
  await createAddress(db, cust!.id, {
    label: "home",
    house: "1",
    pincode: "611002",
    city: "Nagore",
    state: "TN",
  });
  await addToCart(db, cust!.id, V, 5);
  const addr = await db.select().from(schema.addresses).where(eq(schema.addresses.userId, cust!.id));
  const order = await createOrder(db, cust!.id, { addressId: addr[0]!.id, paymentMethod: "cod" });
  // reserved 5, on_hand 20
  const bad = await adjustInventory(db, S, ADM, V, -16);
  assert(bad.ok === false, "adjust below reserved is rejected");
  const good = await adjustInventory(db, S, ADM, V, -10);
  assert(good.ok === true && good.onHand === 10, "adjust to 10 succeeds");

  console.log("→ order status management");
  const confirmed = await adminSetOrderStatus(db, ADM, order.id, "confirmed");
  assert(confirmed.status === "confirmed", "admin advances order to confirmed");

  console.log("→ customer block");
  await setCustomerBlocked(db, ADM, cust!.id, true);
  const [uRow] = await db.select().from(users).where(eq(users.id, cust!.id));
  assert(uRow!.isBlocked === true, "customer blocked");
  await setCustomerBlocked(db, ADM, cust!.id, false);

  console.log("→ store settings upsert");
  await upsertStoreSettings(db, S, ADM, {
    isOpen: true,
    holidayMode: false,
    deliveryFee: 2500,
    handlingFee: 500,
    freeDeliveryThreshold: 20000,
    taxInclusive: true,
  });
  const s2 = await upsertStoreSettings(db, S, ADM, {
    isOpen: false,
    holidayMode: true,
    deliveryFee: 3000,
    handlingFee: 500,
    freeDeliveryThreshold: 25000,
    taxInclusive: true,
  });
  assert(s2.isOpen === false && s2.deliveryFee === 3000, "settings upsert updates the singleton");

  console.log("→ audit trail");
  const audit = await listAuditLog(db, 50);
  assert(audit.length >= 8, `audit recorded every mutation (${audit.length} entries)`);
  assert(audit.every((a) => a.actorName === "Admin"), "audit rows attribute the actor");

  console.log("\n✓ admin operations verified end-to-end");
  await client.close();
}

main().catch((e) => {
  console.error("✗ verification failed:", e);
  process.exit(1);
});
