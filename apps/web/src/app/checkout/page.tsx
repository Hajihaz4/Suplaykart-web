import { redirect } from "next/navigation";
import {
  checkServiceability,
  db,
  deliveryFeeFor,
  getCartView,
  listAddresses,
  requireDefaultSupplier,
} from "@suplaykart/db";
import type { Address, ServiceabilityResult } from "@suplaykart/db";
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

function serviceNote(r: ServiceabilityResult): string | undefined {
  if (r.serviceable) return undefined;
  if (r.reason === "coming_soon")
    return `Coming soon${r.expectedLaunch ? ` · ${r.expectedLaunch}` : ""}`;
  return "Outside our delivery zone";
}

export default async function CheckoutPage() {
  const user = await requireCurrentUser();
  const [cart, addresses, supplier] = await Promise.all([
    getCartView(db, user.id),
    listAddresses(db, user.id),
    requireDefaultSupplier(db),
  ]);
  if (cart.items.length === 0) redirect("/cart");

  const service = await Promise.all(
    addresses.map((a) =>
      checkServiceability(db, supplier.id, {
        pincode: a.pincode,
        lat: a.lat != null ? Number(a.lat) : null,
        lng: a.lng != null ? Number(a.lng) : null,
      }),
    ),
  );

  const delivery = deliveryFeeFor(cart.subtotal);
  const bill = {
    subtotal: cart.subtotal,
    savings: cart.savings,
    delivery,
    total: cart.subtotal + delivery,
    itemCount: cart.itemCount,
  };
  const addressOptions = addresses.map((a, i) => ({
    id: a.id,
    label: labelText(a),
    line: addressLine(a),
    serviceable: service[i]!.serviceable,
    note: serviceNote(service[i]!),
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
