import { AddressForm } from "@suplaykart/ui";
import { AccountHeader } from "@/components/account-header";
import { AddressLocationField } from "@/components/address-location-field";
import { requireCurrentUser } from "@/lib/auth";
import { createAddressAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewAddressPage() {
  await requireCurrentUser();
  return (
    <div className="min-h-screen bg-surface-alt">
      <AccountHeader title="Add address" backHref="/account/addresses" />
      <main className="mx-auto w-full max-w-xl bg-surface">
        <AddressForm
          action={createAddressAction}
          submitLabel="Save address"
          defaultValues={{ label: "home", city: "Nagore", state: "Tamil Nadu" }}
          locationSlot={<AddressLocationField />}
        />
      </main>
    </div>
  );
}
