import Link from "next/link";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Card, EmptyState, SectionHeader, formatINR } from "@suplaykart/ui";
import { db, getCartView } from "@suplaykart/db";
import { StoreShell } from "@/components/store-shell";
import { CartControl } from "@/components/cart-control";
import { requireCurrentUser } from "@/lib/auth";
import { clearCartAction } from "./actions";

export const dynamic = "force-dynamic";

const DELIVERY_FEE = 2500; // paise
const FREE_DELIVERY_MIN = 20000; // paise

export default async function CartPage() {
  const user = await requireCurrentUser();
  const cart = await getCartView(db, user.id);

  if (cart.items.length === 0) {
    return (
      <StoreShell cartCount={0}>
        <SectionHeader title="Your cart" />
        <EmptyState
          icon={<ShoppingCart className="size-8 text-brand" />}
          title="Your cart is empty"
          description="Add items to get started."
          action={
            <Link
              href="/"
              className="flex h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white"
            >
              Browse products
            </Link>
          }
        />
      </StoreShell>
    );
  }

  const delivery = cart.subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
  const total = cart.subtotal + delivery;

  return (
    <StoreShell cartCount={cart.itemCount}>
      <div className="space-y-3 p-3 pb-28">
        <div className="flex items-center justify-between px-1">
          <h1 className="text-base font-extrabold text-ink">
            Your cart ({cart.itemCount})
          </h1>
          <form action={clearCartAction}>
            <button className="flex items-center gap-1 text-2xs font-bold text-danger">
              <Trash2 className="size-3.5" /> Clear
            </button>
          </form>
        </div>

        <Card className="divide-y divide-border-light p-0">
          {cart.items.map((it) => (
            <div key={it.variantId} className="flex items-center gap-3 p-3">
              <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-surface-alt text-2xl">
                <span aria-hidden>{it.image}</span>
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${it.slug}`}
                  className="line-clamp-1 text-sm font-semibold text-ink"
                >
                  {it.name}
                </Link>
                <div className="text-2xs text-muted">{it.unit}</div>
                <div className="mt-0.5 text-sm font-extrabold text-ink">
                  {formatINR(it.lineTotal)}
                </div>
              </div>
              <CartControl variantId={it.variantId} initialQty={it.quantity} />
            </div>
          ))}
        </Card>

        <Card className="space-y-2 p-4 text-sm">
          <Row label="Item total" value={formatINR(cart.subtotal)} />
          {cart.savings > 0 ? (
            <Row label="Savings" value={`− ${formatINR(cart.savings)}`} accent />
          ) : null}
          <Row
            label="Delivery fee"
            value={delivery === 0 ? "FREE" : formatINR(delivery)}
          />
          <div className="mt-1 flex items-center justify-between border-t border-border-light pt-2 text-base font-black text-ink">
            <span>To pay</span>
            <span>{formatINR(total)}</span>
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface px-4 py-3 shadow-nav md:bottom-0">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <div className="flex-1">
            <div className="text-base font-black text-ink">
              {formatINR(total)}
            </div>
            <div className="text-2xs text-muted">{cart.itemCount} items</div>
          </div>
          <Link
            href="/checkout"
            className="flex h-11 items-center justify-center rounded-xl bg-brand px-8 text-sm font-bold text-white"
          >
            Proceed to checkout
          </Link>
        </div>
      </div>
    </StoreShell>
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
