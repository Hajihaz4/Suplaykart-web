import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  broadcastNotification,
  countPushSubscriptions,
  createNotification,
  deletePushSubscription,
  deleteSubscriptionByEndpoint,
  getNotificationPreferences,
  listNotifications,
  listSubscriptionsForUsers,
  listUserSubscriptions,
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
  unreadNotificationCount,
  updateNotificationPreferences,
} from "../src/dal/notifications";
import { type TestDb, makeTestDb, makeUser } from "./harness";

describe("notifications DAL", () => {
  let t: TestDb;
  let A: string;
  let B: string;

  beforeAll(async () => {
    t = await makeTestDb();
    A = await makeUser(t.db);
    B = await makeUser(t.db);
  });
  afterAll(() => t.close());

  it("saves push subscriptions and upserts on endpoint", async () => {
    await savePushSubscription(t.db, A, {
      endpoint: "https://push/1",
      p256dh: "k1",
      auth: "a1",
    });
    await savePushSubscription(t.db, A, {
      endpoint: "https://push/1", // same endpoint → update, not duplicate
      p256dh: "k1b",
      auth: "a1b",
    });
    const subs = await listUserSubscriptions(t.db, A);
    expect(subs).toHaveLength(1);
    expect(subs[0]!.p256dh).toBe("k1b");
    expect(await countPushSubscriptions(t.db)).toBe(1);
  });

  it("lists subscriptions for a set of users and prunes dead ones", async () => {
    await savePushSubscription(t.db, B, {
      endpoint: "https://push/2",
      p256dh: "k2",
      auth: "a2",
    });
    expect(await listSubscriptionsForUsers(t.db, [A, B])).toHaveLength(2);
    await deleteSubscriptionByEndpoint(t.db, "https://push/2");
    expect(await listSubscriptionsForUsers(t.db, [B])).toHaveLength(0);
    await deletePushSubscription(t.db, A, "https://push/1");
    expect(await countPushSubscriptions(t.db)).toBe(0);
  });

  it("gets/creates and updates preferences", async () => {
    const prefs = await getNotificationPreferences(t.db, A);
    expect(prefs.push).toBe(true);
    expect(prefs.promotional).toBe(true);
    const updated = await updateNotificationPreferences(t.db, A, {
      promotional: false,
    });
    expect(updated.promotional).toBe(false);
    expect(updated.push).toBe(true); // untouched
  });

  it("feed: create, list, unread count, mark read", async () => {
    await createNotification(t.db, {
      userId: A,
      type: "order",
      title: "Order placed",
      body: "Thanks!",
    });
    await createNotification(t.db, {
      userId: A,
      type: "delivery",
      title: "Out for delivery",
      body: "Soon!",
    });
    expect(await unreadNotificationCount(t.db, A)).toBe(2);
    const list = await listNotifications(t.db, A);
    expect(list).toHaveLength(2);
    await markNotificationRead(t.db, A, list[0]!.id);
    expect(await unreadNotificationCount(t.db, A)).toBe(1);
    await markAllNotificationsRead(t.db, A);
    expect(await unreadNotificationCount(t.db, A)).toBe(0);
  });

  it("broadcast reaches customers, honoring the promotional opt-out", async () => {
    // A opted out of promotional above; B is still opted in.
    const promo = await broadcastNotification(t.db, {
      type: "offer",
      title: "20% off",
      body: "Today only",
      promotionalOnly: true,
    });
    expect(promo.userIds).toContain(B);
    expect(promo.userIds).not.toContain(A);

    const all = await broadcastNotification(t.db, {
      type: "store",
      title: "Store hours",
      body: "Open till 11pm",
    });
    expect(all.userIds).toEqual(expect.arrayContaining([A, B]));
  });
});
