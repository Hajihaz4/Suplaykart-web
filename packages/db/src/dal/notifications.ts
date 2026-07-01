import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { DB } from "../client";
import {
  notificationPreferences,
  notifications,
  pushSubscriptions,
  users,
} from "../schema";

export type Notification = typeof notifications.$inferSelect;
export type NotificationPrefs = typeof notificationPreferences.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NotificationType =
  | "order"
  | "delivery"
  | "offer"
  | "store"
  | "account"
  | "refund"
  | "weather";

export interface WebPushKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}

// ── push subscriptions ──────────────────────────────────────────────────────

export async function savePushSubscription(
  db: DB,
  userId: string,
  input: WebPushKeys,
): Promise<PushSubscriptionRow> {
  const [row] = await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row!;
}

export async function listUserSubscriptions(
  db: DB,
  userId: string,
): Promise<PushSubscriptionRow[]> {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

export async function listSubscriptionsForUsers(
  db: DB,
  userIds: string[],
): Promise<PushSubscriptionRow[]> {
  if (userIds.length === 0) return [];
  return db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));
}

/** Subscriptions for the given users, excluding those who disabled push. */
export async function listPushableSubscriptions(
  db: DB,
  userIds: string[],
): Promise<PushSubscriptionRow[]> {
  if (userIds.length === 0) return [];
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .leftJoin(
      notificationPreferences,
      eq(notificationPreferences.userId, pushSubscriptions.userId),
    )
    .where(
      and(
        inArray(pushSubscriptions.userId, userIds),
        or(
          isNull(notificationPreferences.push),
          eq(notificationPreferences.push, true),
        ),
      ),
    );
  return rows.map((r) => r.push_subscriptions);
}

export async function deletePushSubscription(
  db: DB,
  userId: string,
  endpoint: string,
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    );
}

/** Remove a dead endpoint (used when the push service returns 404/410). */
export async function deleteSubscriptionByEndpoint(
  db: DB,
  endpoint: string,
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function countPushSubscriptions(db: DB): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(pushSubscriptions);
  return row?.n ?? 0;
}

// ── preferences ─────────────────────────────────────────────────────────────

export async function getNotificationPreferences(
  db: DB,
  userId: string,
): Promise<NotificationPrefs> {
  const [existing] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(notificationPreferences)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [row] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return row!;
}

export interface PreferencesInput {
  whatsapp?: boolean;
  push?: boolean;
  promotional?: boolean;
  storeStatus?: boolean;
}

export async function updateNotificationPreferences(
  db: DB,
  userId: string,
  input: PreferencesInput,
): Promise<NotificationPrefs> {
  await getNotificationPreferences(db, userId); // ensure a row exists
  const [row] = await db
    .update(notificationPreferences)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(notificationPreferences.userId, userId))
    .returning();
  return row!;
}

// ── feed ────────────────────────────────────────────────────────────────────

export async function listNotifications(
  db: DB,
  userId: string,
  limit = 50,
): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.isPinned), desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadNotificationCount(
  db: DB,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    );
  return row?.n ?? 0;
}

export interface NewNotification {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
}

export async function createNotification(
  db: DB,
  input: NewNotification,
): Promise<Notification> {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
    })
    .returning();
  return row!;
}

export async function markNotificationRead(
  db: DB,
  userId: string,
  id: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(
  db: DB,
  userId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    );
}

// ── broadcast (admin) ───────────────────────────────────────────────────────

export interface BroadcastInput {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  /** Only reach customers who allow promotional notifications. */
  promotionalOnly?: boolean;
}

/**
 * Fan a notification out to every customer (optionally only those who allow
 * promotional messages). Returns the reached user ids so the caller can push.
 */
export async function broadcastNotification(
  db: DB,
  input: BroadcastInput,
): Promise<{ count: number; userIds: string[] }> {
  const rows = await db
    .select({
      id: users.id,
      promotional: notificationPreferences.promotional,
    })
    .from(users)
    .leftJoin(
      notificationPreferences,
      eq(notificationPreferences.userId, users.id),
    )
    .where(eq(users.role, "customer"));

  const targets = rows
    .filter((r) => !input.promotionalOnly || r.promotional !== false)
    .map((r) => r.id);
  if (targets.length === 0) return { count: 0, userIds: [] };

  await db.insert(notifications).values(
    targets.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
    })),
  );
  return { count: targets.length, userIds: targets };
}
