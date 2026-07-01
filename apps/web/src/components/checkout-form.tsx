"use client";
import * as React from "react";
import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Card, formatINR } from "@suplaykart/ui";
import { placeOrderAction, type CheckoutState } from "@/app/checkout/actions";

export interface AddressOption {
  id: string;
  label: string;
  line: string;
}

export interface CheckoutBill {
  subtotal: number;
  savings: number;
  delivery: number;
  total: number;
  itemCount: number;
}

const PAYMENTS = [
  { value: "cod", title: "Cash on Delivery", desc: "Pay with cash when it arrives" },
  { value: "upi_on_delivery", title: "UPI on Delivery", desc: "Scan & pay at your door" },
] as const;

export function CheckoutForm({
  addresses,
  defaultAddressId,
  bill,
}: {
  addresses: AddressOption[];
  defaultAddressId: string | null;
  bill: CheckoutBill;
}) {
  const [state, action, pending] = React.useActionState<CheckoutState, FormData>(
    placeOrderAction,
    {},
  );
  const [addressId, setAddressId] = React.useState(defaultAddressId ?? "");
  const [payment, setPayment] = React.useState<string>("cod");

  const noAddress = addresses.length === 0;

  return (
    <form action={action} className="space-y-3 p-3 pb-28">
      {/* delivery address */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-extrabold text-ink">
          Delivery address
        </h2>
        {noAddress ? (
          <Link
            href="/account/addresses/new"
            className="flex items-center gap-2 rounded-xl border border-dashed border-brand bg-brand-light px-4 py-4 text-sm font-bold text-brand"
          >
            <Plus className="size-4" /> Add a delivery address
          </Link>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-3 ${
                  addressId === a.id
                    ? "border-brand ring-1 ring-brand"
                    : "border-border-light"
                }`}
              >
                <input
                  type="radio"
                  name="addressId"
                  value={a.id}
                  checked={addressId === a.id}
                  onChange={() => setAddressId(a.id)}
                  className="mt-1 accent-brand"
                />
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">
                    {a.label}
                  </span>
                  <span className="block text-xs text-muted">{a.line}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* payment method */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-extrabold text-ink">Payment</h2>
        <div className="space-y-2">
          {PAYMENTS.map((p) => (
            <label
              key={p.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-surface p-3 ${
                payment === p.value
                  ? "border-brand ring-1 ring-brand"
                  : "border-border-light"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={p.value}
                checked={payment === p.value}
                onChange={() => setPayment(p.value)}
                className="accent-brand"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink">
                  {p.title}
                </span>
                <span className="block text-xs text-muted">{p.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* delivery instructions */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-extrabold text-ink">
          Delivery instructions{" "}
          <span className="font-medium text-muted">(optional)</span>
        </h2>
        <textarea
          name="deliveryInstructions"
          rows={2}
          maxLength={200}
          placeholder="e.g. Ring the bell, leave at the door"
          className="w-full rounded-xl border border-border-light bg-surface p-3 text-sm text-ink placeholder:text-muted-light focus:border-brand focus:outline-none"
        />
      </section>

      {/* bill */}
      <Card className="space-y-2 p-4 text-sm">
        <Row label="Item total" value={formatINR(bill.subtotal)} />
        {bill.savings > 0 ? (
          <Row label="Savings" value={`− ${formatINR(bill.savings)}`} accent />
        ) : null}
        <Row
          label="Delivery fee"
          value={bill.delivery === 0 ? "FREE" : formatINR(bill.delivery)}
        />
        <div className="mt-1 flex items-center justify-between border-t border-border-light pt-2 text-base font-black text-ink">
          <span>To pay</span>
          <span>{formatINR(bill.total)}</span>
        </div>
      </Card>

      {state.error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {state.error}
        </p>
      ) : null}

      {/* place order */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 py-3 shadow-nav">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <div className="flex-1">
            <div className="text-base font-black text-ink">
              {formatINR(bill.total)}
            </div>
            <div className="text-2xs text-muted">{bill.itemCount} items</div>
          </div>
          <button
            type="submit"
            disabled={pending || noAddress || !addressId}
            className="flex h-11 items-center justify-center rounded-xl bg-brand px-8 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "Placing…" : "Place order"}
          </button>
        </div>
      </div>
    </form>
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
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span
        className={accent ? "font-bold text-brand" : "font-semibold text-ink"}
      >
        {value}
      </span>
    </div>
  );
}
