"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AddressNotFoundError,
  EmptyCartError,
  OutOfStockError,
  createOrder,
  db,
} from "@suplaykart/db";
import { requireCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const schema = z.object({
  addressId: z.string().uuid("Select a delivery address"),
  paymentMethod: z.enum(["cod", "upi_on_delivery"]),
  deliveryInstructions: z.string().max(200).optional(),
});

export interface CheckoutState {
  error?: string | null;
}

export async function placeOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await requireCurrentUser();

  const limit = rateLimit(`checkout:${user.id}`, 8, 60_000);
  if (!limit.ok) {
    return { error: "Too many attempts. Please wait a moment and try again." };
  }

  const parsed = schema.safeParse({
    addressId: formData.get("addressId"),
    paymentMethod: formData.get("paymentMethod"),
    deliveryInstructions:
      (formData.get("deliveryInstructions") as string) || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let orderId: string;
  try {
    const order = await createOrder(db, user.id, {
      addressId: parsed.data.addressId,
      paymentMethod: parsed.data.paymentMethod,
      deliveryInstructions: parsed.data.deliveryInstructions ?? null,
    });
    orderId = order.id;
    logger.info("order.placed", {
      orderId,
      orderNumber: order.orderNumber,
      userId: user.id,
      total: order.totalAmount,
      paymentMethod: order.paymentMethod,
    });
  } catch (e) {
    if (e instanceof EmptyCartError) return { error: "Your cart is empty." };
    if (e instanceof AddressNotFoundError)
      return { error: "Delivery address not found." };
    if (e instanceof OutOfStockError) {
      logger.warn("order.oversell_blocked", { userId: user.id });
      return {
        error: "Some items just went out of stock. Please adjust your cart.",
      };
    }
    logger.error("order.place_failed", {
      userId: user.id,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }

  redirect(`/account/orders/${orderId}`);
}
