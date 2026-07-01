"use client";
import * as React from "react";
import { Button, QuantityStepper } from "@suplaykart/ui";
import { addToCartAction, updateCartQuantityAction } from "@/app/cart/actions";

/** Live ADD / quantity-stepper wired to the server cart (optimistic). */
export function CartControl({
  variantId,
  initialQty,
}: {
  variantId: string;
  initialQty: number;
}) {
  const [qty, setQty] = React.useState(initialQty);
  const [pending, start] = React.useTransition();

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

  if (qty <= 0) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="h-8 px-3"
        onClick={add}
        disabled={pending || !variantId}
      >
        ADD
      </Button>
    );
  }
  return <QuantityStepper value={qty} onChange={commit} size="sm" />;
}
