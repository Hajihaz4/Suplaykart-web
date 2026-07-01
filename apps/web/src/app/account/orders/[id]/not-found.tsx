import Link from "next/link";
import { PackageX } from "lucide-react";
import { EmptyState } from "@suplaykart/ui";
import { AccountHeader } from "@/components/account-header";

export default function OrderNotFound() {
  return (
    <div className="min-h-screen bg-surface-alt">
      <AccountHeader title="Order" backHref="/account/orders" />
      <EmptyState
        icon={<PackageX className="size-8 text-brand" />}
        title="Order not found"
        description="This order doesn't exist or isn't yours."
        action={
          <Link
            href="/account/orders"
            className="flex h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white"
          >
            Back to orders
          </Link>
        }
      />
    </div>
  );
}
