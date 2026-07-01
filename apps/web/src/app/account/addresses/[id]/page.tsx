import { notFound } from "next/navigation";
import { AddressForm } from "@suplaykart/ui";
import { db, getAddressById } from "@suplaykart/db";
import { AccountHeader } from "@/components/account-header";
import { requireCurrentUser } from "@/lib/auth";
import { updateAddressAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditAddressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const address = await getAddressById(db, user.id, id);
  if (!address) notFound();

  return (
    <div className="min-h-screen bg-surface-alt">
      <AccountHeader title="Edit address" backHref="/account/addresses" />
      <main className="mx-auto w-full max-w-xl bg-surface">
        <AddressForm
          action={updateAddressAction.bind(null, id)}
          submitLabel="Update address"
          defaultValues={{
            label: address.label,
            customLabel: address.customLabel,
            recipientName: address.recipientName,
            recipientPhone: address.recipientPhone,
            house: address.house,
            floor: address.floor,
            area: address.area,
            landmark: address.landmark,
            pincode: address.pincode,
            city: address.city,
            state: address.state,
            isDefault: address.isDefault,
          }}
        />
      </main>
    </div>
  );
}
