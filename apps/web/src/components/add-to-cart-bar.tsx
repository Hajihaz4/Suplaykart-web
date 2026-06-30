"use client";
import * as React from "react";
import { Button, QuantityStepper, formatINR, useToast } from "@suplaykart/ui";

export function AddToCartBar({ price }: { price: number }) {
  const [qty, setQty] = React.useState(0);
  const { toast } = useToast();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 py-3 shadow-nav">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <div className="flex-1">
          <div className="text-base font-black text-ink">{formatINR(price)}</div>
          <div className="text-2xs text-muted">Inclusive of all taxes</div>
        </div>
        {qty === 0 ? (
          <Button
            className="px-8"
            onClick={() => {
              setQty(1);
              toast("Added to cart");
            }}
          >
            Add to cart
          </Button>
        ) : (
          <QuantityStepper value={qty} onChange={setQty} className="h-11" />
        )}
      </div>
    </div>
  );
}
