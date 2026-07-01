import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import {
  Card,
  EmptyState,
  OrderStatusBadge,
  formatDateTime,
  formatINR,
} from "@suplaykart/ui";
import { db, listOrders } from "@suplaykart/db";
import type { OrderStatus } from "@suplaykart/db";
import { AccountHeader } from "@/components/account-header";
import { requireCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; status?: OrderStatus }[] = [
  { key: "all", label: "All" },
  { key: "placed", label: "Active", status: "placed" },
  { key: "out_for_delivery", label: "On the way", status: "out_for_delivery" },
  { key: "delivered", label: "Delivered", status: "delivered" },
  { key: "cancelled", label: "Cancelled", status: "cancelled" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const user = await requireCurrentUser();
  const active = FILTERS.find((f) => f.key === status) ?? FILTERS[0]!;
  const orders = await listOrders(db, user.id, {
    status: active.status,
    q: q ?? undefined,
  });
  const filtering = Boolean(active.status || q?.trim());
  const qs = (key: string) =>
    `/account/orders?status=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="min-h-screen bg-surface-alt">
      <AccountHeader title="My Orders" />

      <div className="space-y-2 bg-surface px-3 py-3">
        <form action="/account/orders" className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by order number (SP-…)"
            className="h-9 flex-1 rounded-lg border border-border-light bg-surface-alt px-3 text-sm text-ink focus:border-brand focus:outline-none"
          />
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <button className="h-9 rounded-lg bg-brand px-4 text-xs font-bold text-white">
            Search
          </button>
        </form>
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={qs(f.key)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${
                active.key === f.key
                  ? "bg-brand text-white"
                  : "bg-surface-alt text-muted"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        filtering ? (
          <div className="p-8 text-center text-sm text-muted">
            No orders match this filter.{" "}
            <Link href="/account/orders" className="font-bold text-brand">
              Clear
            </Link>
          </div>
        ) : (
        <EmptyState
          icon={<Package className="size-8 text-brand" />}
          title="No orders yet"
          description="Your orders will appear here once you place one."
          action={
            <Link
              href="/"
              className="flex h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white"
            >
              Start shopping
            </Link>
          }
        />
        )
      ) : (
        <div className="space-y-2.5 p-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.id}`}>
              <Card className="flex items-center gap-3 p-3.5">
                <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-light text-brand">
                  <Package className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-ink">
                      {o.orderNumber}
                    </span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-muted">
                    {o.firstItemName}
                    {o.extraLines > 0 ? ` +${o.extraLines} more` : ""} ·{" "}
                    {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
                  </div>
                  <div className="mt-0.5 text-2xs text-muted-light">
                    {formatDateTime(o.placedAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-ink">
                    {formatINR(o.totalAmount)}
                  </div>
                  <ChevronRight className="ml-auto size-4 text-muted-light" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
