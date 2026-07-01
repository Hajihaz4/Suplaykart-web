import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { addresses, productVariants, products, users } from "../src/schema";
import { createAddress } from "../src/dal/addresses";
import { addToCart } from "../src/dal/cart";
import { createOrder, listOrders } from "../src/dal/orders";
import { getAdminStats } from "../src/dal/admin";
import {
  adjustInventory,
  adminSetOrderStatus,
  createCategory,
  createProduct,
  getProductForEdit,
  listAuditLog,
  setCustomerBlocked,
  setProductActive,
  updateProduct,
  upsertStoreSettings,
} from "../src/dal/admin-ops";
import type { DB } from "../src/client";
import {
  type TestDb,
  makeCategory,
  makeSupplier,
  makeTestDb,
  makeUser,
} from "./harness";

async function variantOf(db: DB, productId: string) {
  const [v] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        eq(productVariants.isDefault, true),
      ),
    );
  return v!.id;
}

describe("admin operations", () => {
  let t: TestDb;
  let S: string;
  let cat: string;
  let ADM: string;
  let cust: string;

  beforeAll(async () => {
    t = await makeTestDb();
    S = await makeSupplier(t.db);
    cat = await makeCategory(t.db, S);
    ADM = await makeUser(t.db, { role: "owner", name: "Admin" });
    cust = await makeUser(t.db, { role: "customer" });
  });
  afterAll(() => t.close());

  it("creates, edits, and hides a product (with variant + stock)", async () => {
    const pid = await createProduct(t.db, S, ADM, {
      name: "Chips",
      slug: "chips",
      categoryId: cat,
      price: 5000,
      mrp: 6000,
      unit: "50 g",
      initialStock: 20,
    });
    const edit = await getProductForEdit(t.db, S, pid);
    expect(edit?.price).toBe(5000);

    await updateProduct(t.db, S, ADM, pid, {
      name: "Chips XL",
      categoryId: cat,
      price: 5500,
      unit: "90 g",
    });
    expect((await getProductForEdit(t.db, S, pid))?.name).toBe("Chips XL");

    await setProductActive(t.db, S, ADM, pid, false);
    const [p] = await t.db.select().from(products).where(eq(products.id, pid));
    expect(p!.isActive).toBe(false);
  });

  it("adjusts inventory but guards against dropping below reserved", async () => {
    const pid = await createProduct(t.db, S, ADM, {
      name: "Soda",
      slug: "soda",
      categoryId: cat,
      price: 4000,
      unit: "500 ml",
      initialStock: 20,
    });
    const V = await variantOf(t.db, pid);

    await createAddress(t.db, cust, {
      label: "home",
      house: "1",
      pincode: "611002",
      city: "Nagore",
      state: "TN",
    });
    const [addr] = await t.db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, cust));
    await addToCart(t.db, cust, V, 5);
    await createOrder(t.db, cust, {
      addressId: addr!.id,
      paymentMethod: "cod",
    });

    expect((await adjustInventory(t.db, S, ADM, V, -16)).ok).toBe(false);
    const good = await adjustInventory(t.db, S, ADM, V, -10);
    expect(good.ok).toBe(true);
  });

  it("advances order status as staff", async () => {
    const [o] = await listOrders(t.db, cust);
    const updated = await adminSetOrderStatus(t.db, ADM, o!.id, "confirmed");
    expect(updated.status).toBe("confirmed");
  });

  it("blocks and unblocks a customer", async () => {
    await setCustomerBlocked(t.db, ADM, cust, true);
    const [u] = await t.db.select().from(users).where(eq(users.id, cust));
    expect(u!.isBlocked).toBe(true);
    await setCustomerBlocked(t.db, ADM, cust, false);
  });

  it("upserts the settings singleton", async () => {
    await upsertStoreSettings(t.db, S, ADM, {
      isOpen: true,
      holidayMode: false,
      deliveryFee: 2500,
      handlingFee: 0,
      freeDeliveryThreshold: 20000,
      taxInclusive: true,
    });
    const s2 = await upsertStoreSettings(t.db, S, ADM, {
      isOpen: false,
      holidayMode: true,
      deliveryFee: 3000,
      handlingFee: 0,
      freeDeliveryThreshold: 25000,
      taxInclusive: true,
    });
    expect(s2.isOpen).toBe(false);
    expect(s2.deliveryFee).toBe(3000);
  });

  it("records every mutation in the audit log", async () => {
    await createCategory(t.db, S, ADM, { name: "Drinks", slug: "drinks" });
    const audit = await listAuditLog(t.db, 50);
    expect(audit.length).toBeGreaterThanOrEqual(8);
    expect(audit.every((a) => a.actorName === "Admin")).toBe(true);
  });

  it("computes dashboard stats", async () => {
    const stats = await getAdminStats(t.db, S);
    expect(stats.products).toBeGreaterThanOrEqual(2);
    expect(stats.customers).toBeGreaterThanOrEqual(1);
    expect(stats.orders).toBeGreaterThanOrEqual(1);
  });
});
