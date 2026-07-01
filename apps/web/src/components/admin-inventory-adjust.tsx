"use client";
import * as React from "react";
import { adjustInventoryAction } from "@/app/admin/mutations";

export function AdminInventoryAdjust({ variantId }: { variantId: string }) {
  const [pending, start] = React.useTransition();
  const [delta, setDelta] = React.useState("");

  const apply = () => {
    const d = parseInt(delta, 10);
    if (!Number.isFinite(d) || d === 0) return;
    start(async () => {
      await adjustInventoryAction(variantId, d);
      setDelta("");
    });
  };

  return (
    <div className="flex items-center gap-1">
      <input
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        inputMode="numeric"
        placeholder="±0"
        aria-label="Stock delta"
        className="h-8 w-16 rounded-lg border border-border-light px-2 text-xs text-ink focus:border-brand focus:outline-none"
      />
      <button
        onClick={apply}
        disabled={pending}
        className="h-8 rounded-lg bg-brand px-2.5 text-2xs font-bold text-white disabled:opacity-50"
      >
        Apply
      </button>
    </div>
  );
}
