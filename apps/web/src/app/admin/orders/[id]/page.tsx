import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminGetOrderById, canTransition, db } from "@suplaykart/db";
import {
  ORDER_STATUS_META,
  OrderStatusBadge,
  formatDateTime,
  formatINR,
} from "@suplaykart/ui";
import type { OrderStatusKey } from "@suplaykart/ui";
import { AdminOrderStatus } from "@/components/admin-order-status";

const ALL_STATUSES: OrderStatusKey[] = [
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  upi_on_delivery: "UPI on Delivery",
};

interface AddressSnap {
  recipientName?: string | null;
  house?: string;
  area?: string | null;
  landmark?: string | null;
  city?: string;
  pincode?: string;
}

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await adminGetOrderById(db, id);
  if (!order) notFound();

  const a = (order.deliveryAddress ?? {}) as AddressSnap;
  const next = ALL_STATUSES.filter((s) => canTransition(order.status, s));

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border-light bg-surface px-4 py-4 md:px-6">
        <Link
          href="/admin/orders"
          className="grid size-8 place-items-center rounded-full bg-surface-alt"
        >
          <ArrowLeft className="size-4 text-ink" />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold text-ink">
            {order.orderNumber}
          </h1>
          <div className="text-2xs text-muted">
            {formatDateTime(order.placedAt)}
          </div>
        </div>
        <div className="ml-auto">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
        <div className="space-y-4 md:col-span-2">
          {/* items */}
          <div className="rounded-xl border border-border-light bg-surface">
            <div className="border-b border-border-light px-4 py-3 text-sm font-extrabold text-ink">
              Items
            </div>
            {order.items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between border-b border-border-light px-4 py-2.5 text-sm last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{it.productName}</div>
                  <div className="text-2xs text-muted">
                    {it.variantLabel} · {formatINR(it.unitPrice)} × {it.quantity}
                  </div>
                </div>
                <div className="font-bold text-ink">
                  {formatINR(it.lineTotal)}
                </div>
              </div>
            ))}
          </div>

          {/* timeline */}
          <div className="rounded-xl border border-border-light bg-surface p-4">
            <div className="mb-3 text-sm font-extrabold text-ink">Timeline</div>
            <ol className="relative space-y-3 border-l border-border pl-5">
              {order.history.map((ev, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[27px] top-0.5 size-3 rounded-full bg-brand" />
                  <div className="text-sm font-bold text-ink">
                    {ORDER_STATUS_META[ev.status as OrderStatusKey]?.label ??
                      ev.status}
                    <span className="ml-2 text-2xs font-medium text-muted-light">
                      {ev.actor}
                    </span>
                  </div>
                  <div className="text-2xs text-muted-light">
                    {formatDateTime(ev.createdAt)}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          <AdminOrderStatus orderId={order.id} next={next} />

          {/* customer */}
          <div className="rounded-xl border border-border-light bg-surface p-4 text-sm">
            <div className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted">
              Customer
            </div>
            <div className="font-bold text-ink">
              {order.customerName ?? "—"}
            </div>
            <div className="text-muted">{order.customerPhone}</div>
            <Link
              href={`/admin/customers`}
              className="mt-1 inline-block text-2xs font-bold text-brand"
            >
              View customers →
            </Link>
          </div>

          {/* address */}
          <div className="rounded-xl border border-border-light bg-surface p-4 text-sm">
            <div className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted">
              Delivery address
            </div>
            <div className="text-ink">
              {[a.house, a.area, a.landmark].filter(Boolean).join(", ")}
            </div>
            <div className="text-muted">
              {a.city} — {a.pincode}
            </div>
          </div>

          {/* bill */}
          <div className="space-y-1.5 rounded-xl border border-border-light bg-surface p-4 text-sm">
            <div className="mb-1 text-2xs font-bold uppercase tracking-wide text-muted">
              Bill
            </div>
            <Row label="Subtotal" value={formatINR(order.subtotal)} />
            {order.savingsTotal > 0 ? (
              <Row label="Savings" value={`− ${formatINR(order.savingsTotal)}`} />
            ) : null}
            <Row
              label="Delivery"
              value={
                order.deliveryFee === 0 ? "FREE" : formatINR(order.deliveryFee)
              }
            />
            <div className="flex justify-between border-t border-border-light pt-1.5 text-base font-black text-ink">
              <span>Total</span>
              <span>{formatINR(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between pt-1 text-xs text-muted">
              <span>
                {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
              </span>
              <span
                className={
                  order.paymentStatus === "collected"
                    ? "font-bold text-brand"
                    : ""
                }
              >
                {order.paymentStatus === "collected" ? "Paid" : "Pending"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
