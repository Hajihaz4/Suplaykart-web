"use client";
import * as React from "react";
import { Button, QuantityStepper, formatINR } from "@suplaykart/ui";
import { addToCartAction, updateCartQuantityAction } from "@/app/cart/actions";

export function AddToCartBar({
  variantId,
  price,
  initialQty,
}: {
  variantId: string;
  price: number;
  initialQty: number;
}) {
  const [qty, setQty] = React.useState(initialQty);
  const [, start] = React.useTransition();

  React.useEffect(() => setQty(initialQty), [initialQty]);

  const commit = (next: number) => {
    setQty(next);
    start(async () => {
      await updateCartQuantityAction(variantId, next);
    });
  };
  const add = () => {
    setQty(1);
    start(async () => {
      await addToCartAction(variantId, 1);
    });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 py-3 shadow-nav">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <div className="flex-1">
          <div className="text-base font-black text-ink">{formatINR(price)}</div>
          <div className="text-2xs text-muted">Inclusive of all taxes</div>
        </div>
        {qty === 0 ? (
          <Button className="px-8" onClick={add} disabled={!variantId}>
            Add to cart
          </Button>
        ) : (
          <QuantityStepper value={qty} onChange={commit} className="h-11" />
        )}
      </div>
    </div>
  );
}
