import { AccountHeader } from "@/components/account-header";

export default function LoadingOrderDetail() {
  return (
    <div className="min-h-screen bg-surface-alt">
      <AccountHeader title="Order" backHref="/account/orders" />
      <div className="mx-auto w-full max-w-3xl space-y-3 p-3">
        {[160, 220, 120, 180].map((h, i) => (
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
