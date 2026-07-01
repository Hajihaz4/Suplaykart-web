import { redirect } from "next/navigation";
import { db, deliveryFeeFor, getCartView, listAddresses } from "@suplaykart/db";
import type { Address } from "@suplaykart/db";
import { requireCurrentUser } from "@/lib/auth";
import { AccountHeader } from "@/components/account-header";
import { CheckoutForm } from "@/components/checkout-form";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = { home: "Home", work: "Work", other: "Other" };

function labelText(a: Address): string {
  if (a.label === "other") return a.customLabel?.trim() || "Other";
  return LABELS[a.label] ?? "Address";
}

function addressLine(a: Address): string {
  return [a.house, a.area, a.landmark, `${a.city} — ${a.pincode}`]
    .filter(Boolean)
    .join(", ");
}

export default async function CheckoutPage() {
  const user = await requireCurrentUser();
  const [cart, addresses] = await Promise.all([
    getCartView(db, user.id),
    listAddresses(db, user.id),
  ]);
  if (cart.items.length === 0) redirect("/cart");

  const delivery = deliveryFeeFor(cart.subtotal);
  const bill = {
    subtotal: cart.subtotal,
    savings: cart.savings,
    delivery,
    total: cart.subtotal + delivery,
    itemCount: cart.itemCount,
  };
  const addressOptions = addresses.map((a) => ({
    id: a.id,
    label: labelText(a),
    line: addressLine(a),
  }));
  const defaultAddressId =
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;

  return (
    <div className="min-h-screen bg-surface-alt pb-8">
      <AccountHeader title="Checkout" backHref="/cart" />
      <div className="mx-auto w-full max-w-3xl">
        <CheckoutForm
          addresses={addressOptions}
          defaultAddressId={defaultAddressId}
          bill={bill}
        />
      </div>
    </div>
  );
}
