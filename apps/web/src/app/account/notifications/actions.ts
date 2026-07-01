"use server";
import { revalidatePath } from "next/cache";
import {
  db,
  deletePushSubscription,
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
  updateNotificationPreferences,
} from "@suplaykart/db";
import { requireCurrentUser } from "@/lib/auth";

export interface WebPushJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function subscribePushAction(
  sub: WebPushJSON,
  userAgent?: string,
): Promise<{ ok: boolean }> {
  const user = await requireCurrentUser();
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false };
  }
  await savePushSubscription(db, user.id, {
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    userAgent: userAgent ?? null,
  });
  return { ok: true };
}

export async function unsubscribePushAction(endpoint: string): Promise<void> {
  const user = await requireCurrentUser();
  await deletePushSubscription(db, user.id, endpoint);
}

export async function updatePreferencesAction(input: {
  push?: boolean;
  promotional?: boolean;
  storeStatus?: boolean;
  whatsapp?: boolean;
}): Promise<void> {
  const user = await requireCurrentUser();
  await updateNotificationPreferences(db, user.id, input);
  revalidatePath("/account/notifications");
}

export async function markReadAction(id: string): Promise<void> {
  const user = await requireCurrentUser();
  await markNotificationRead(db, user.id, id);
  revalidatePath("/account/notifications");
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireCurrentUser();
  await markAllNotificationsRead(db, user.id);
  revalidatePath("/account/notifications");
}
