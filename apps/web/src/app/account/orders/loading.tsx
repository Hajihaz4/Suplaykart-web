import { AccountHeader } from "@/components/account-header";

export default function LoadingOrders() {
  return (
    <div className="min-h-screen bg-surface-alt">
      <AccountHeader title="My Orders" />
      <div className="space-y-2.5 p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[74px] animate-pulse rounded-xl border border-border-light bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
