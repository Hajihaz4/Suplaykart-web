"use server";
import { revalidatePath } from "next/cache";
import { cancelOrder, db } from "@suplaykart/db";
import { requireCurrentUser } from "@/lib/auth";

export async function cancelOrderAction(orderId: string): Promise<void> {
  const user = await requireCurrentUser();
  await cancelOrder(db, user.id, orderId, "Cancelled by customer");
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
}
