import "server-only";
import webpush from "web-push";
import {
  db,
  deleteSubscriptionByEndpoint,
  listPushableSubscriptions,
} from "@suplaykart/db";
import { env } from "@/env";

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT ?? "mailto:notifications@suplaykart.com";
  if (pub && priv) {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  } else {
    configured = false;
  }
  return configured;
}

/** True when VAPID keys are present, i.e. push can actually be sent. */
export function isPushConfigured(): boolean {
  return ensureConfigured();
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface SubKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendOne(
  sub: SubKeys,
  payload: PushPayload,
): Promise<{ ok: boolean; gone: boolean }> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return { ok: true, gone: false };
  } catch (e: unknown) {
    const status =
      typeof e === "object" && e && "statusCode" in e
        ? (e as { statusCode?: number }).statusCode
        : undefined;
    return { ok: false, gone: status === 404 || status === 410 };
  }
}

/**
 * Push to a set of users. No-op (returns 0) when VAPID is unconfigured, so
 * order/broadcast flows work without credentials. Respects each user's master
 * `push` preference and prunes dead endpoints (404/410).
 */
export async function pushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  if (!ensureConfigured() || userIds.length === 0) {
    return { sent: 0, pruned: 0 };
  }
  const subs = await listPushableSubscriptions(db, userIds);
  let sent = 0;
  let pruned = 0;
  await Promise.all(
    subs.map(async (s) => {
      const res = await sendOne(s, payload);
      if (res.ok) sent += 1;
      if (res.gone) {
        await deleteSubscriptionByEndpoint(db, s.endpoint);
        pruned += 1;
      }
    }),
  );
  return { sent, pruned };
}
