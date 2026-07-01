import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { orders } from "../src/schema";
import {
  createPaymentRecord,
  getPaymentByOrder,
  recordProviderPayment,
  refundPayment,
  setPaymentStatus,
} from "../src/dal/payments";
import { type TestDb, makeSupplier, makeTestDb, makeUser } from "./harness";

// Exercises the gateway-readiness surface (Razorpay path) that the in-txn
// order lifecycle test in orders.test.ts does not touch.
describe("payments DAL — gateway readiness", () => {
  let t: TestDb;
  let orderId: string;

  beforeAll(async () => {
    t = await makeTestDb();
    const sup = await makeSupplier(t.db);
    const user = await makeUser(t.db);
    const [o] = await t.db
      .insert(orders)
      .values({
        orderNumber: "SP-PAY1",
        userId: user,
        supplierId: sup,
        paymentMethod: "upi_on_delivery",
        deliveryAddress: {},
        subtotal: 15000,
        totalAmount: 15200,
        status: "placed",
      })
      .returning();
    orderId = o!.id;
  });
  afterAll(() => t.close());

  it("creates a pending payment record for a future gateway", async () => {
    const pay = await createPaymentRecord(t.db, {
      orderId,
      provider: "razorpay",
      amount: 15200,
    });
    expect(pay.status).toBe("pending");
    expect(pay.provider).toBe("razorpay");
    const fetched = await getPaymentByOrder(t.db, orderId);
    expect(fetched).toMatchObject({ amount: 15200, status: "pending" });
  });

  it("attaches gateway identifiers on capture", async () => {
    await recordProviderPayment(t.db, orderId, {
      providerOrderId: "order_ABC",
      providerPaymentId: "pay_XYZ",
      status: "collected",
    });
    const pay = await getPaymentByOrder(t.db, orderId);
    expect(pay!.status).toBe("collected");
    expect(pay!.providerOrderId).toBe("order_ABC");
    expect(pay!.providerPaymentId).toBe("pay_XYZ");
  });

  it("refunds and records the reason in meta", async () => {
    await refundPayment(t.db, orderId, "customer request");
    const pay = await getPaymentByOrder(t.db, orderId);
    expect(pay!.status).toBe("refunded");
    expect(pay!.meta).toMatchObject({ refundReason: "customer request" });
  });

  it("transitions status directly", async () => {
    await setPaymentStatus(t.db, orderId, "failed");
    expect((await getPaymentByOrder(t.db, orderId))!.status).toBe("failed");
  });
});
