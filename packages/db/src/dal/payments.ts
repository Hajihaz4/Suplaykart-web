import { desc, eq } from "drizzle-orm";
import type { DB } from "../client";
import { payments } from "../schema";
import type { Executor } from "./inventory";

export type Payment = typeof payments.$inferSelect;
export type PaymentProvider = "cod" | "upi_on_delivery" | "razorpay";
export type PaymentRecordStatus =
  | "pending"
  | "collected"
  | "refunded"
  | "failed";

export interface NewPayment {
  orderId: string;
  provider: PaymentProvider;
  amount: number;
  status?: PaymentRecordStatus;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
}

/** Create the payment record for an order (composes inside the order txn). */
export async function createPaymentRecord(
  exec: Executor,
  input: NewPayment,
): Promise<Payment> {
  const [row] = await exec
    .insert(payments)
    .values({
      orderId: input.orderId,
      provider: input.provider,
      amount: input.amount,
      status: input.status ?? "pending",
      providerOrderId: input.providerOrderId ?? null,
      providerPaymentId: input.providerPaymentId ?? null,
    })
    .returning();
  return row!;
}

export async function getPaymentByOrder(
  db: DB,
  orderId: string,
): Promise<Payment | null> {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return row ?? null;
}

/** Move a payment through its lifecycle (pending → collected/failed/refunded). */
export async function setPaymentStatus(
  exec: Executor,
  orderId: string,
  status: PaymentRecordStatus,
): Promise<void> {
  await exec
    .update(payments)
    .set({ status, updatedAt: new Date() })
    .where(eq(payments.orderId, orderId));
}

/** Attach gateway identifiers to a payment (Razorpay capture/authorize). */
export async function recordProviderPayment(
  db: DB,
  orderId: string,
  input: {
    providerOrderId?: string;
    providerPaymentId?: string;
    status: PaymentRecordStatus;
  },
): Promise<void> {
  await db
    .update(payments)
    .set({
      providerOrderId: input.providerOrderId ?? null,
      providerPaymentId: input.providerPaymentId ?? null,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(payments.orderId, orderId));
}

/** Refund-ready: mark a payment refunded (records the reason in meta). */
export async function refundPayment(
  db: DB,
  orderId: string,
  reason?: string,
): Promise<void> {
  await db
    .update(payments)
    .set({
      status: "refunded",
      meta: reason ? { refundReason: reason } : null,
      updatedAt: new Date(),
    })
    .where(eq(payments.orderId, orderId));
}
