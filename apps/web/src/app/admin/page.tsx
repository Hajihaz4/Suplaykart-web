import Link from "next/link";
import {
  adminListOrders,
  db,
  getAdminStats,
  listAuditLog,
  requireDefaultSupplier,
} from "@suplaykart/db";
import { OrderStatusBadge, formatDateTime, formatINR } from "@suplaykart/ui";
import { AdminPageHeader, DataTable, StatCard, Td } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supplier = await requireDefaultSupplier(db);
  const [stats, recent, activity] = await Promise.all([
    getAdminStats(db, supplier.id),
    adminListOrders(db, supplier.id, 8),
    listAuditLog(db, 8),
  ]);

  return (
    <>
      <AdminPageHeader title="Dashboard" description="Store overview" />
      <div className="space-y-5 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Revenue"
            value={formatINR(stats.revenue)}
            hint="Delivered orders"
            tone="brand"
          />
          <StatCard
            label="Orders"
            value={String(stats.orders)}
            hint={`${stats.pendingOrders} in progress`}
          />
          <StatCard
            label="Products"
            value={String(stats.activeProducts)}
            hint={`${stats.products} total`}
          />
          <StatCard label="Customers" value={String(stats.customers)} />
          <StatCard label="Categories" value={String(stats.categories)} />
          <StatCard
            label="Low stock"
            value={String(stats.lowStock)}
            tone={stats.lowStock ? "danger" : "default"}
            hint="At/below threshold"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-ink">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-bold text-brand">
              View all →
            </Link>
          </div>
          <DataTable
            cols={["Order", "Customer", "Status", "Total", "Placed"]}
            empty={recent.length === 0}
          >
            {recent.map((o) => (
              <tr key={o.id} className="hover:bg-surface-alt">
                <Td>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-bold text-brand"
                  >
                    {o.orderNumber}
                  </Link>
                </Td>
                <Td>{o.customerName ?? o.customerPhone}</Td>
                <Td>
                  <OrderStatusBadge status={o.status} />
                </Td>
                <Td className="font-semibold">{formatINR(o.totalAmount)}</Td>
                <Td className="text-muted">{formatDateTime(o.placedAt)}</Td>
              </tr>
            ))}
          </DataTable>
        </div>

        {activity.length > 0 ? (
          <div>
            <h2 className="mb-2 text-sm font-extrabold text-ink">
              Recent activity
            </h2>
            <div className="divide-y divide-border-light rounded-xl border border-border-light bg-surface">
              {activity.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-ink">
                      {a.summary ?? a.action}
                    </span>
                    <span className="ml-2 text-2xs text-muted-light">
                      {a.actorName ?? "system"}
                    </span>
                  </div>
                  <span className="shrink-0 text-2xs text-muted-light">
                    {formatDateTime(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
