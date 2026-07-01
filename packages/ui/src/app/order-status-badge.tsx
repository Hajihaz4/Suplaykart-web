import { cn } from "../lib/cn";

export type OrderStatusKey =
  | "placed"
  | "confirmed"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_META: Record<
  OrderStatusKey,
  { label: string; cls: string }
> = {
  placed: { label: "Placed", cls: "bg-info-light text-info" },
  confirmed: { label: "Confirmed", cls: "bg-brand-light text-brand" },
  packed: { label: "Packed", cls: "bg-accent-light text-accent" },
  out_for_delivery: {
    label: "Out for delivery",
    cls: "bg-warning-light text-warning",
  },
  delivered: { label: "Delivered", cls: "bg-brand text-white" },
  cancelled: { label: "Cancelled", cls: "bg-danger-light text-danger" },
};

/** Forward path for the customer/admin progress tracker (excludes cancelled). */
export const ORDER_FLOW: OrderStatusKey[] = [
  "placed",
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
];

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatusKey;
  className?: string;
}) {
  const meta = ORDER_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-bold",
        meta.cls,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
