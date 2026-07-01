import { ORDER_FLOW, ORDER_STATUS_META } from "@suplaykart/ui";
import type { OrderStatusKey } from "@suplaykart/ui";

export function OrderStatusTracker({ status }: { status: OrderStatusKey }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl bg-danger-light p-3 text-center text-sm font-bold text-danger">
        Order cancelled
      </div>
    );
  }
  const idx = ORDER_FLOW.indexOf(status);
  const pct =
    ORDER_FLOW.length > 1 ? (idx / (ORDER_FLOW.length - 1)) * 100 : 0;

  return (
    <div className="relative flex justify-between px-1 pb-1">
      <div className="absolute inset-x-3 top-3 h-0.5 bg-border" />
      <div
        className="absolute left-3 top-3 h-0.5 bg-brand"
        style={{ width: `calc(${pct}% - ${pct > 0 ? "0px" : "0px"})` }}
      />
      {ORDER_FLOW.map((s, i) => {
        const reached = i <= idx;
        return (
          <div key={s} className="relative z-10 flex flex-col items-center">
            <span
              className={`grid size-6 place-items-center rounded-full text-2xs font-bold ${
                reached
                  ? "bg-brand text-white"
                  : "border border-border bg-surface text-muted-light"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </span>
            <span
              className={`mt-1 max-w-14 text-center text-[9px] leading-tight ${
                reached ? "font-bold text-ink" : "text-muted-light"
              }`}
            >
              {ORDER_STATUS_META[s].label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
