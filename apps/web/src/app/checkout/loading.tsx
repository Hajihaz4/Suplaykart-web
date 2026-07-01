import { AccountHeader } from "@/components/account-header";

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-surface-alt">
      <AccountHeader title="Checkout" backHref="/cart" />
      <div className="mx-auto w-full max-w-3xl space-y-3 p-3">
        {[120, 140, 90, 160].map((h, i) => (
          <div
            key={i}
            style={{ height: h }}
            className="animate-pulse rounded-xl border border-border-light bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
