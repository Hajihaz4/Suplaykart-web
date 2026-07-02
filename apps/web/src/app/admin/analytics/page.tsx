import {
  db,
  getConversionMetrics,
  getCustomerAnalytics,
  getLegacyMigrationStats,
  getOperationalMetrics,
  getOrderStatusBreakdown,
  getRevenueByDay,
  getTopProducts,
  requireDefaultSupplier,
} from "@suplaykart/db";
import { OrderStatusBadge, formatINR } from "@suplaykart/ui";
import type { OrderStatusKey } from "@suplaykart/ui";
import { AdminPageHeader, StatCard } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminAnalytics() {
  const supplier = await requireDefaultSupplier(db);
  const [revenue, status, top, customers, ops, conv, migration] =
    await Promise.all([
      getRevenueByDay(db, supplier.id, 14),
      getOrderStatusBreakdown(db, supplier.id),
      getTopProducts(db, supplier.id, 8),
      getCustomerAnalytics(db),
      getOperationalMetrics(db, supplier.id),
      getConversionMetrics(db, supplier.id),
      getLegacyMigrationStats(db),
    ]);
  const maxRev = Math.max(1, ...revenue.map((r) => r.revenue));

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        description="Revenue, products & customers"
      />
      <div className="space-y-5 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Avg order value"
            value={formatINR(ops.avgOrderValue)}
            tone="brand"
          />
          <StatCard
            label="Avg items / order"
            value={String(ops.avgItemsPerOrder)}
          />
          <StatCard
            label="Fulfillment"
            value={`${conv.fulfillmentRate.toFixed(0)}%`}
          />
          <StatCard
            label="Cancellation"
            value={`${conv.cancellationRate.toFixed(0)}%`}
            tone={conv.cancellationRate > 20 ? "danger" : "default"}
          />
          <StatCard
            label="Customers"
            value={String(customers.total)}
            hint={`+${customers.newLast30d} in 30d`}
          />
          <StatCard label="Repeat buyers" value={String(customers.repeat)} />
          <StatCard label="Active carts" value={String(conv.activeCarts)} />
          <StatCard
            label="Low stock"
            value={String(ops.lowStock)}
            tone={ops.lowStock ? "danger" : "default"}
          />
        </div>

        <div className="rounded-xl border border-border-light bg-surface p-4">
          <h2 className="mb-3 text-sm font-extrabold text-ink">
            Revenue — last 14 days
          </h2>
          {revenue.length === 0 ? (
            <p className="text-sm text-muted">No orders in this window yet.</p>
          ) : (
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {revenue.map((r) => (
                <div
                  key={r.day}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                  title={`${r.day}: ${formatINR(r.revenue)} (${r.orders} orders)`}
                >
                  <div
                    className="w-full rounded-t bg-brand"
                    style={{
                      height: `${Math.max(2, (r.revenue / maxRev) * 100)}%`,
                    }}
                  />
                  <span className="text-[8px] text-muted-light">
                    {r.day.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border-light bg-surface p-4">
            <h2 className="mb-2 text-sm font-extrabold text-ink">
              Orders by status
            </h2>
            {status.length === 0 ? (
              <p className="text-sm text-muted">No orders yet.</p>
            ) : (
              <div className="space-y-1.5">
                {status.map((s) => (
                  <div
                    key={s.status}
                    className="flex items-center justify-between text-sm"
                  >
                    <OrderStatusBadge status={s.status as OrderStatusKey} />
                    <span className="font-bold text-ink">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border-light bg-surface p-4">
            <h2 className="mb-2 text-sm font-extrabold text-ink">
              Top products
            </h2>
            {top.length === 0 ? (
              <p className="text-sm text-muted">No sales yet.</p>
            ) : (
              <div className="space-y-1.5">
                {top.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate text-ink">{p.name}</span>
                    <span className="shrink-0 font-bold text-muted">
                      {p.qty} · {formatINR(p.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {migration.staging && migration.staging.customersTotal > 0 ? (
          // full-width section (outside the 2-col grid — no layout holes);
          // hidden while the staging schema is empty/absent (ETL not yet run)
          <div className="rounded-xl border border-border-light bg-surface p-4">
            <h2 className="mb-2 text-sm font-extrabold text-ink">
              Legacy store migration
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Customers linked"
                value={`${migration.staging.customersLinked} / ${migration.staging.customersTotal}`}
                tone="brand"
              />
              <StatCard
                label="Orders attributed"
                value={`${migration.staging.ordersAttributable} / ${migration.staging.ordersTotal}`}
              />
              <StatCard
                label="Legacy revenue"
                value={formatINR(migration.staging.deliveredRevenue)}
              />
              <StatCard
                label="Link attempts"
                value={String(
                  Object.values(migration.attempts).reduce((a, b) => a + b, 0),
                )}
                hint={
                  Object.entries(migration.attempts)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || "none yet"
                }
              />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
