import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { inventory } from "../src/schema";
import { createAddress } from "../src/dal/addresses";
import { addToCart } from "../src/dal/cart";
import { OutOfStockError } from "../src/dal/inventory";
import { getPaymentByOrder } from "../src/dal/payments";
import {
  InvalidTransitionError,
  cancelOrder,
  createOrder,
  getOrderById,
  listOrders,
  updateOrderStatus,
} from "../src/dal/orders";
import type { DB } from "../src/client";
import {
  type TestDb,
  makeCategory,
  makeProduct,
  makeSupplier,
  makeTestDb,
  makeUser,
} from "./harness";

async function stock(db: DB, variantId: string) {
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

describe("order + inventory lifecycle", () => {
  let t: TestDb;
  let A: string;
  let B: string;
  let V: string;
  let addrA: string;
  let addrB: string;

  beforeAll(async () => {
    t = await makeTestDb();
    const sup = await makeSupplier(t.db);
    const cat = await makeCategory(t.db, sup);
    V = (
      await makeProduct(t.db, {
        supplierId: sup,
        categoryId: cat,
        price: 5000,
        mrp: 6000,
        stock: 10,
      })
    ).variantId;
    A = await makeUser(t.db);
    B = await makeUser(t.db);
    addrA = (
      await createAddress(t.db, A, {
        label: "home",
        house: "1",
        pincode: "611002",
        city: "Nagore",
        state: "TN",
      })
    ).id;
    addrB = (
      await createAddress(t.db, B, {
        label: "home",
        house: "2",
        pincode: "611002",
        city: "Nagore",
        state: "TN",
      })
    ).id;
  });
  afterAll(() => t.close());

  it("creates a placed COD order and reserves stock", async () => {
    await addToCart(t.db, A, V, 2);
    const o = await createOrder(t.db, A, {
      addressId: addrA,
      paymentMethod: "cod",
    });
    expect(o.status).toBe("placed");
    expect(o.paymentStatus).toBe("pending");
    expect(o.totalAmount).toBe(5000 * 2 + 2500);
    const s = await stock(t.db, V);
    expect(s.reserved).toBe(2);
    expect(s.available).toBe(8);
  });

  it("prevents overselling and rolls back fully", async () => {
    await addToCart(t.db, B, V, 100);
    await expect(
      createOrder(t.db, B, { addressId: addrB, paymentMethod: "cod" }),
    ).rejects.toBeInstanceOf(OutOfStockError);
    expect((await stock(t.db, V)).reserved).toBe(2);
    expect(await listOrders(t.db, B)).toHaveLength(0);
  });

  it("commits the sale and collects payment on delivery", async () => {
    const [o] = await listOrders(t.db, A);
    for (const st of ["confirmed", "packed", "out_for_delivery", "delivered"] as const) {
      await updateOrderStatus(t.db, o!.id, st, { actor: "staff" });
    }
    const detail = await getOrderById(t.db, A, o!.id);
    expect(detail!.status).toBe("delivered");
    expect(detail!.paymentStatus).toBe("collected");
    expect(detail!.history).toHaveLength(5);
    const s = await stock(t.db, V);
    expect(s.onHand).toBe(8);
    expect(s.reserved).toBe(0);
  });

  it("rejects invalid transitions", async () => {
    const [o] = await listOrders(t.db, A);
    await expect(
      updateOrderStatus(t.db, o!.id, "cancelled", { actor: "staff" }),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("releases stock on customer cancel and enforces ownership", async () => {
    await addToCart(t.db, A, V, 3);
    const o2 = await createOrder(t.db, A, {
      addressId: addrA,
      paymentMethod: "upi_on_delivery",
    });
    expect((await stock(t.db, V)).reserved).toBe(3);

    const byB = await cancelOrder(t.db, B, o2.id);
    expect(byB.ok).toBe(false);

    const ok = await cancelOrder(t.db, A, o2.id);
    expect(ok.ok).toBe(true);
    expect((await stock(t.db, V)).reserved).toBe(0);
    expect(await getOrderById(t.db, B, o2.id)).toBeNull();
  });

  it("records the payment lifecycle (pending → collected/failed)", async () => {
    for (const o of await listOrders(t.db, A)) {
      const pay = await getPaymentByOrder(t.db, o.id);
      expect(pay).not.toBeNull();
      expect(pay!.amount).toBe(o.totalAmount);
      if (o.status === "delivered") expect(pay!.status).toBe("collected");
      if (o.status === "cancelled") expect(pay!.status).toBe("failed");
    }
  });

  it("filters orders by status and searches by number", async () => {
    const all = await listOrders(t.db, A);
    expect(all.length).toBeGreaterThanOrEqual(2);
    const cancelled = await listOrders(t.db, A, { status: "cancelled" });
    expect(cancelled.length).toBeGreaterThanOrEqual(1);
    expect(cancelled.every((o) => o.status === "cancelled")).toBe(true);
    const byNum = await listOrders(t.db, A, { q: all[0]!.orderNumber });
    expect(byNum).toHaveLength(1);
    expect(byNum[0]!.orderNumber).toBe(all[0]!.orderNumber);
  });
});
