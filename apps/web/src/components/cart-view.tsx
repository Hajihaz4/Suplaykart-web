"use client";
import * as React from "react";
import Link from "next/link";
import { Button, EmptyState, QuantityStepper, formatINR, useToast } from "@suplaykart/ui";
import { CART_LINES, type CartLine } from "@/lib/mock-data";

const DELIVERY_FEE = 1500; // paise
const HANDLING_FEE = 300;
const FREE_DELIVERY_THRESHOLD = 4900;

export function CartView() {
  const [lines, setLines] = React.useState<CartLine[]>(() =>
    CART_LINES.map((l) => ({ ...l })),
  );
  const { toast } = useToast();

  const setQty = (id: string, qty: number) =>
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.product.id !== id)
        : prev.map((l) => (l.product.id === id ? { ...l, qty } : l)),
    );

  const subtotal = lines.reduce((n, l) => n + l.product.price * l.qty, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal === 0 ? 0 : subtotal + deliveryFee + HANDLING_FEE;

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<span>🛒</span>}
        title="Your cart is empty"
        description="Add items to get started."
        action={
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-bold text-white shadow-brand"
          >
            Browse products
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-2 pb-4">
      <div className="bg-surface">
        <div className="px-4 py-3 text-sm font-extrabold text-ink">
          {lines.length} {lines.length === 1 ? "item" : "items"} in cart
        </div>
        <ul>
          {lines.map((l) => (
            <li
              key={l.product.id}
              className="flex items-center gap-3 border-t border-border-light px-4 py-3"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-alt text-2xl">
                {l.product.image}
              </span>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-xs font-semibold text-ink">
                  {l.product.name}
                </div>
                <div className="text-2xs text-muted">{l.product.unit}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <QuantityStepper
                  value={l.qty}
                  onChange={(q) => setQty(l.product.id, q)}
                  size="sm"
                />
                <span className="text-xs font-extrabold text-ink">
                  {formatINR(l.product.price * l.qty)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-surface p-4">
        <div className="mb-2 text-sm font-extrabold text-ink">Bill details</div>
        <Row label="Item total" value={formatINR(subtotal)} />
        <Row
          label="Delivery fee"
          value={deliveryFee === 0 ? "FREE" : formatINR(deliveryFee)}
          accent={deliveryFee === 0}
        />
        <Row label="Handling charge" value={formatINR(HANDLING_FEE)} />
        <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2.5">
          <span className="text-sm font-extrabold text-ink">Grand total</span>
          <span className="text-base font-black text-ink">
            {formatINR(total)}
          </span>
        </div>
      </div>

      <div className="px-4">
        <Button
          block
          size="lg"
          onClick={() => toast("Sign in to checkout (Phase 1D)")}
        >
          Proceed to checkout · {formatINR(total)}
        </Button>
        <p className="mt-2 text-center text-2xs text-muted">
          Checkout is wired in a later phase — this is the UI foundation.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-muted">{label}</span>
      <span className={accent ? "font-bold text-brand" : "font-bold text-ink"}>
        {value}
      </span>
    </div>
  );
}
