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
import { AccountHeader } from "@/components/account-header";
import { requireCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireCurrentUser();
  const orders = await listOrders(db, user.id);

  return (
    <div className="min-h-screen bg-surface-alt">
      <AccountHeader title="My Orders" />
      {orders.length === 0 ? (
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
