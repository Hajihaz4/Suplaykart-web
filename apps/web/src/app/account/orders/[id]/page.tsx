import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import {
  Card,
  ORDER_STATUS_META,
  OrderStatusBadge,
  formatDateTime,
  formatINR,
} from "@suplaykart/ui";
import { db, getOrderById } from "@suplaykart/db";
import { AccountHeader } from "@/components/account-header";
import { requireCurrentUser } from "@/lib/auth";
import { CancelOrderButton } from "@/components/cancel-order-button";

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  upi_on_delivery: "UPI on Delivery",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const order = await getOrderById(db, user.id, id);
  if (!order) notFound();

  const a = order.deliveryAddress;
  const addressLine = [a.house, a.floor, a.area, a.landmark]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-surface-alt pb-8">
      <AccountHeader title={order.orderNumber} backHref="/account/orders" />

      <div className="mx-auto w-full max-w-3xl space-y-3 p-3">
        {/* status + timeline */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted">Order status</div>
              <div className="mt-0.5">
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
            <div className="text-right text-2xs text-muted-light">
              Placed {formatDateTime(order.placedAt)}
            </div>
          </div>

          {order.status === "cancelled" && order.cancelReason ? (
            <p className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-xs font-semibold text-danger">
              {order.cancelReason}
            </p>
          ) : null}

          <ol className="relative space-y-4 border-l border-border pl-5">
            {order.history.map((ev, i) => {
              const meta = ORDER_STATUS_META[ev.status];
              const isLast = i === order.history.length - 1;
              return (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[27px] top-0.5 grid size-3.5 place-items-center rounded-full ${
                      isLast ? "bg-brand" : "bg-border"
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-white" />
                  </span>
                  <div className="text-sm font-bold text-ink">{meta.label}</div>
                  {ev.note ? (
                    <div className="text-2xs text-muted">{ev.note}</div>
                  ) : null}
                  <div className="text-2xs text-muted-light">
                    {formatDateTime(ev.createdAt)}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        {/* items */}
        <Card className="p-0">
          <div className="border-b border-border-light px-4 py-3 text-sm font-extrabold text-ink">
            {order.items.length} item{order.items.length === 1 ? "" : "s"}
          </div>
          {order.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 border-b border-border-light px-4 py-3 last:border-b-0"
            >
              {it.isVeg != null ? (
                <span
                  className={`grid size-3.5 shrink-0 place-items-center rounded-[3px] border-[1.5px] ${
                    it.isVeg ? "border-brand" : "border-danger"
                  } bg-white`}
                >
                  <span
                    className={`size-1.5 rounded-full ${it.isVeg ? "bg-brand" : "bg-danger"}`}
                  />
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm font-semibold text-ink">
                  {it.productName}
                </div>
                <div className="text-2xs text-muted">
                  {it.variantLabel} · {formatINR(it.unitPrice)} × {it.quantity}
                </div>
              </div>
              <div className="text-sm font-bold text-ink">
                {formatINR(it.lineTotal)}
              </div>
            </div>
          ))}
        </Card>

        {/* delivery address */}
        <Card className="flex items-start gap-3 p-4">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-ink">
              Delivering to {a.recipientName ?? "you"}
            </div>
            <div className="text-xs text-muted">
              {addressLine}
              {addressLine ? ", " : ""}
              {a.city} — {a.pincode}
            </div>
            {order.deliveryInstructions ? (
              <div className="mt-1 text-2xs text-muted-light">
                Note: {order.deliveryInstructions}
              </div>
            ) : null}
          </div>
        </Card>

        {/* bill */}
        <Card className="space-y-2 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Item total</span>
            <span className="font-semibold text-ink">
              {formatINR(order.subtotal)}
            </span>
          </div>
          {order.savingsTotal > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-muted">Savings</span>
              <span className="font-bold text-brand">
                − {formatINR(order.savingsTotal)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-muted">Delivery fee</span>
            <span className="font-semibold text-ink">
              {order.deliveryFee === 0 ? "FREE" : formatINR(order.deliveryFee)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border-light pt-2 text-base font-black text-ink">
            <span>Total</span>
            <span>{formatINR(order.totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-muted">
              {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
            </span>
            <span
              className={
                order.paymentStatus === "collected"
                  ? "font-bold text-brand"
                  : "font-semibold text-muted"
              }
            >
              {order.paymentStatus === "collected" ? "Paid" : "Payment pending"}
            </span>
          </div>
        </Card>

        {order.cancellable ? <CancelOrderButton orderId={order.id} /> : null}
      </div>
    </div>
  );
}
