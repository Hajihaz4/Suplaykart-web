import {
  countPushSubscriptions,
  db,
  getAdminStats,
  requireDefaultSupplier,
} from "@suplaykart/db";
import { isPushConfigured } from "@/lib/push";
import { AdminPageHeader, StatCard } from "@/components/admin-ui";
import { AdminBroadcast } from "@/components/admin-broadcast";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const supplier = await requireDefaultSupplier(db);
  const [subs, stats] = await Promise.all([
    countPushSubscriptions(db),
    getAdminStats(db, supplier.id),
  ]);
  const configured = isPushConfigured();

  return (
    <>
      <AdminPageHeader
        title="Notifications"
        description="Broadcasts & push status"
      />
      <div className="space-y-5 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Push status"
            value={configured ? "Live" : "Off"}
            tone={configured ? "brand" : "warning"}
            hint={configured ? "VAPID configured" : "Set VAPID keys"}
          />
          <StatCard label="Subscriptions" value={String(subs)} hint="devices" />
          <StatCard label="Customers" value={String(stats.customers)} />
        </div>

        {!configured ? (
          <div className="rounded-xl border border-dashed border-warning bg-warning-light p-4 text-xs text-ink">
            <b>Push sending is off</b> — broadcasts are still recorded in each
            customer&apos;s feed. To send real push, generate VAPID keys with{" "}
            <code className="font-mono">npx web-push generate-vapid-keys</code>{" "}
            and set <code className="font-mono">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>,{" "}
            <code className="font-mono">VAPID_PRIVATE_KEY</code>, and{" "}
            <code className="font-mono">VAPID_SUBJECT</code> in the environment.
          </div>
        ) : null}

        <AdminBroadcast />
      </div>
    </>
  );
}
