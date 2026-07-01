import {
  db,
  getNotificationPreferences,
  listNotifications,
  unreadNotificationCount,
} from "@suplaykart/db";
import { formatDateTime } from "@suplaykart/ui";
import { AccountHeader } from "@/components/account-header";
import { requireCurrentUser } from "@/lib/auth";
import { NotificationSettings } from "@/components/notification-settings";
import { markAllReadAction, markReadAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireCurrentUser();
  const [items, prefs, unread] = await Promise.all([
    listNotifications(db, user.id, 50),
    getNotificationPreferences(db, user.id),
    unreadNotificationCount(db, user.id),
  ]);

  return (
    <div className="min-h-screen bg-surface-alt pb-8">
      <AccountHeader title="Notifications" />
      <div className="mx-auto w-full max-w-3xl space-y-4 p-3">
        <NotificationSettings
          prefs={{
            push: prefs.push,
            promotional: prefs.promotional,
            storeStatus: prefs.storeStatus,
            whatsapp: prefs.whatsapp,
          }}
        />

        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-ink">
            Recent{unread ? ` · ${unread} unread` : ""}
          </h2>
          {unread > 0 ? (
            <form action={markAllReadAction}>
              <button className="text-2xs font-bold text-brand">
                Mark all read
              </button>
            </form>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-border-light bg-surface p-8 text-center text-sm text-muted">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <form key={n.id} action={markReadAction.bind(null, n.id)}>
                <button
                  type="submit"
                  className={`block w-full rounded-xl border p-3 text-left ${
                    n.isRead
                      ? "border-border-light bg-surface"
                      : "border-brand/30 bg-brand-light"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-ink">
                      {n.title}
                    </span>
                    <span className="shrink-0 text-2xs text-muted-light">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
