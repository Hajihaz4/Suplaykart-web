"use client";
import * as React from "react";
import { ORDER_STATUS_META } from "@suplaykart/ui";
import type { OrderStatusKey } from "@suplaykart/ui";
import { setOrderStatusAction } from "@/app/admin/actions";

export function AdminOrderStatus({
  orderId,
  next,
}: {
  orderId: string;
  next: OrderStatusKey[];
}) {
  const [pending, start] = React.useTransition();
  if (next.length === 0) return null;

  return (
    <div className="rounded-xl border border-border-light bg-surface p-4">
      <div className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted">
        Update status
      </div>
      <div className="flex flex-wrap gap-2">
        {next.map((s) => {
          const cancel = s === "cancelled";
          return (
            <button
              key={s}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await setOrderStatusAction(orderId, s);
                })
              }
              className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${
                cancel
                  ? "border border-danger/40 text-danger"
                  : "bg-brand text-white"
              }`}
            >
              {cancel ? "Cancel order" : `Mark ${ORDER_STATUS_META[s].label}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
