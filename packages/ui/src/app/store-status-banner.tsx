import * as React from "react";
import { cn } from "../lib/cn";
import type { StoreStatus } from "../types";

export interface StoreStatusBannerProps {
  status: StoreStatus;
  message?: string;
  etaText?: string;
  className?: string;
}

export function StoreStatusBanner({
  status,
  message,
  etaText,
  className,
}: StoreStatusBannerProps) {
  if (status === "open") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl bg-brand-light px-3.5 py-2.5 text-xs font-bold text-brand",
          className,
        )}
      >
        <span className="size-2 animate-pulse rounded-full bg-brand" />
        {etaText ?? "Delivering in 22 mins"}
      </div>
    );
  }

  const closed = status === "closed";
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5",
        closed
          ? "border-danger/30 bg-danger-light text-danger"
          : "border-accent/30 bg-accent-light text-accent",
        className,
      )}
    >
      <span className="text-base">🏪</span>
      <span className="text-xs font-semibold">
        {message ??
          (closed ? "Store is closed right now" : "On holiday — back soon")}
      </span>
    </div>
  );
}
