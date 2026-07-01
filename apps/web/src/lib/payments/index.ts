import "server-only";
import { env } from "@/env";

/**
 * Payment abstraction. Phase-1/2 operate on COD + UPI-on-delivery (no gateway):
 * an order gets a `payments` record (pending → collected on delivery). This
 * layer keeps the store gateway-ready and refund-ready without live creds.
 *
 * When Razorpay creds + SDK are added, wire `createGatewayOrder` /
 * `verifyGatewaySignature` here; everything downstream (payment records,
 * lifecycle, refunds) is already in place.
 */

export type PaymentMethod = "cod" | "upi_on_delivery";
export const OFFLINE_METHODS: PaymentMethod[] = ["cod", "upi_on_delivery"];

export function isGatewayConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

export interface GatewayOrder {
  id: string;
  amount: number;
  currency: string;
  keyId: string;
}

/**
 * Create a gateway order for an online payment. Returns null when no gateway is
 * configured, so the checkout gracefully stays on COD / UPI-on-delivery.
 */
export async function createGatewayOrder(
  _amountPaise: number,
): Promise<GatewayOrder | null> {
  if (!isGatewayConfigured()) return null;
  // TODO(razorpay): instantiate the SDK with RAZORPAY_KEY_ID/SECRET and
  //   `const o = await rzp.orders.create({ amount, currency: "INR" })`.
  //   Return { id: o.id, amount, currency: "INR", keyId: env.RAZORPAY_KEY_ID! }.
  return null;
}
