"use server";
import { revalidatePath } from "next/cache";
import { broadcastNotification, db, writeAudit } from "@suplaykart/db";
import type { NotificationType } from "@suplaykart/db";
import { requireAdmin } from "@/lib/auth";
import { pushToUsers } from "@/lib/push";

export interface BroadcastResult {
  ok: boolean;
  error?: string;
  count?: number;
}

const TYPES: NotificationType[] = ["offer", "store", "account"];

export async function sendBroadcastAction(input: {
  title: string;
  body: string;
  type: NotificationType;
  promotionalOnly: boolean;
  url?: string;
}): Promise<BroadcastResult> {
  const admin = await requireAdmin();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body)
    return { ok: false, error: "Title and message are required." };
  if (!TYPES.includes(input.type))
    return { ok: false, error: "Invalid type." };

  const { count, userIds } = await broadcastNotification(db, {
    type: input.type,
    title,
    body,
    promotionalOnly: input.promotionalOnly,
  });
  await pushToUsers(userIds, {
    title,
    body,
    url: input.url?.trim() || "/account/notifications",
    tag: "broadcast",
  });
  await writeAudit(db, {
    actorUserId: admin.id,
    action: "notification.broadcast",
    entity: "notification",
    summary: `Broadcast "${title}" to ${count} customer(s)`,
  });
  revalidatePath("/admin/notifications");
  return { ok: true, count };
}
