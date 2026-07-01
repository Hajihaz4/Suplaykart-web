import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { orderItems, orders } from "../src/schema";
import {
  assignSupplierUser,
  getSupplierReport,
  getUserSupplierIds,
  isSupplierMember,
  listSupplierUsers,
  removeSupplierUser,
} from "../src/dal/suppliers";
import { type TestDb, makeSupplier, makeTestDb, makeUser } from "./harness";

describe("supplier foundation DAL", () => {
  let t: TestDb;
  let S: string;
  let staff: string;
  let customer: string;

  beforeAll(async () => {
    t = await makeTestDb();
    S = await makeSupplier(t.db);
    staff = await makeUser(t.db, { role: "ops" });
    customer = await makeUser(t.db);
  });
  afterAll(() => t.close());

  it("assigns, lists, and scopes supplier membership", async () => {
    await assignSupplierUser(t.db, S, staff, "ops");
    await assignSupplierUser(t.db, S, staff, "admin"); // upsert → role change
    const members = await listSupplierUsers(t.db, S);
    expect(members).toHaveLength(1);
    expect(members[0]!.role).toBe("admin");
    expect(await isSupplierMember(t.db, S, staff)).toBe(true);
    expect(await isSupplierMember(t.db, S, customer)).toBe(false);
    expect(await getUserSupplierIds(t.db, staff)).toEqual([S]);
    await removeSupplierUser(t.db, S, staff);
    expect(await isSupplierMember(t.db, S, staff)).toBe(false);
  });

  it("computes a supplier-scoped report", async () => {
    const [order] = await t.db
      .insert(orders)
      .values({
        orderNumber: "SP-RPT1",
        userId: customer,
        supplierId: S,
        paymentMethod: "cod",
        deliveryAddress: {},
        subtotal: 12400,
        totalAmount: 12500,
        status: "delivered",
      })
      .returning();
    await t.db.insert(orderItems).values({
      orderId: order!.id,
      productName: "Aavin Milk",
      variantLabel: "1 L",
      unitPrice: 6200,
      quantity: 2,
      lineTotal: 12400,
    });

    const report = await getSupplierReport(t.db, S);
    expect(report.revenue).toBe(12500);
    expect(report.orders).toBe(1);
    expect(report.delivered).toBe(1);
    expect(report.topProducts[0]).toMatchObject({ name: "Aavin Milk", qty: 2 });
  });
});
