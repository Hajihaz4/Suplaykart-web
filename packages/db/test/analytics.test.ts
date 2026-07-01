import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { orderItems, orders } from "../src/schema";
import {
  getConversionMetrics,
  getCustomerAnalytics,
  getOperationalMetrics,
  getOrderStatusBreakdown,
  getRevenueByDay,
  getTopProducts,
} from "../src/dal/analytics";
import {
  type TestDb,
  makeSupplier,
  makeTestDb,
  makeUser,
} from "./harness";

async function seedOrder(
  t: TestDb,
  opts: {
    supplierId: string;
    userId: string;
    number: string;
    status: "placed" | "delivered" | "cancelled";
    total: number;
    items: { name: string; qty: number; line: number }[];
  },
) {
  const [order] = await t.db
    .insert(orders)
    .values({
      orderNumber: opts.number,
      userId: opts.userId,
      supplierId: opts.supplierId,
      paymentMethod: "cod",
      deliveryAddress: {},
      subtotal: opts.total,
      totalAmount: opts.total,
      status: opts.status,
    })
    .returning();
  for (const it of opts.items) {
    await t.db.insert(orderItems).values({
      orderId: order!.id,
      productName: it.name,
      variantLabel: "1 unit",
      unitPrice: Math.round(it.line / it.qty),
      quantity: it.qty,
      lineTotal: it.line,
    });
  }
  return order!.id;
}

describe("analytics DAL", () => {
  let t: TestDb;
  let S: string;
  let alice: string;
  let bob: string;

  beforeAll(async () => {
    t = await makeTestDb();
    S = await makeSupplier(t.db);
    alice = await makeUser(t.db);
    bob = await makeUser(t.db);
    // Alice: two delivered orders (repeat buyer), Bob: one cancelled.
    await seedOrder(t, {
      supplierId: S,
      userId: alice,
      number: "SP-A1",
      status: "delivered",
      total: 20000,
      items: [{ name: "Aavin Milk", qty: 2, line: 12000 }],
    });
    await seedOrder(t, {
      supplierId: S,
      userId: alice,
      number: "SP-A2",
      status: "delivered",
      total: 10000,
      items: [{ name: "Aavin Milk", qty: 1, line: 6000 }],
    });
    await seedOrder(t, {
      supplierId: S,
      userId: bob,
      number: "SP-B1",
      status: "cancelled",
      total: 5000,
      items: [{ name: "Bread", qty: 1, line: 5000 }],
    });
  });
  afterAll(() => t.close());

  it("computes revenue by day (delivered only)", async () => {
    const rows = await getRevenueByDay(t.db, S, 14);
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    expect(revenue).toBe(30000); // two delivered orders; cancelled excluded
    const orderCount = rows.reduce((s, r) => s + r.orders, 0);
    expect(orderCount).toBe(3); // all orders counted in the window
  });

  it("breaks down orders by status", async () => {
    const rows = await getOrderStatusBreakdown(t.db, S);
    const map = Object.fromEntries(rows.map((r) => [r.status, r.count]));
    expect(map.delivered).toBe(2);
    expect(map.cancelled).toBe(1);
  });

  it("ranks top products by quantity", async () => {
    const top = await getTopProducts(t.db, S, 8);
    expect(top[0]).toMatchObject({ name: "Aavin Milk", qty: 3, revenue: 18000 });
  });

  it("summarizes customers and repeat buyers", async () => {
    const c = await getCustomerAnalytics(t.db);
    expect(c.total).toBe(2);
    expect(c.repeat).toBe(1); // only Alice has >1 order
  });

  it("computes operational metrics", async () => {
    const ops = await getOperationalMetrics(t.db, S);
    // avg of 20000, 10000, 5000
    expect(ops.avgOrderValue).toBe(11667);
    expect(ops.avgItemsPerOrder).toBeCloseTo(1.3, 1);
    expect(ops.pendingOrders).toBe(0);
  });

  it("computes conversion metrics", async () => {
    const conv = await getConversionMetrics(t.db, S);
    expect(conv.orders).toBe(3);
    // delivered 2 / (delivered 2 + cancelled 1) = 66.6%
    expect(conv.fulfillmentRate).toBeCloseTo(66.67, 1);
    expect(conv.cancellationRate).toBeCloseTo(33.33, 1);
  });
});
