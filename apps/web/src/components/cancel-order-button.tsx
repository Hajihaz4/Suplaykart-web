"use client";
import * as React from "react";
import { X } from "lucide-react";
import { cancelOrderAction } from "@/app/account/orders/actions";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [pending, start] = React.useTransition();

  const onCancel = () => {
    if (!window.confirm("Cancel this order? Reserved items will be released."))
      return;
    start(async () => {
      await cancelOrderAction(orderId);
    });
  };

  return (
    <button
      onClick={onCancel}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/40 bg-surface px-4 py-3 text-sm font-bold text-danger disabled:opacity-50"
    >
      <X className="size-4" /> {pending ? "Cancelling…" : "Cancel order"}
    </button>
  );
}
