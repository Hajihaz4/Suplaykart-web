import Link from "next/link";
import { Plus } from "lucide-react";
import { AddressCard, EmptyState } from "@suplaykart/ui";
import { db, listAddresses, type Address } from "@suplaykart/db";
import { AccountHeader } from "@/components/account-header";
import { requireCurrentUser } from "@/lib/auth";
import { deleteAddressAction, setDefaultAddressAction } from "./actions";

export const dynamic = "force-dynamic";

function labelText(a: Address): string {
  if (a.label === "other") return a.customLabel?.trim() || "Other";
  return a.label === "work" ? "Work" : "Home";
}

function addressLine(a: Address): string {
  return [a.house, a.floor, a.area, a.landmark, `${a.city} — ${a.pincode}`]
    .filter(Boolean)
    .join(", ");
}

export default async function AddressesPage() {
  const user = await requireCurrentUser();
  const addresses = await listAddresses(db, user.id);

  return (
    <div className="min-h-screen bg-surface-alt pb-8">
      <AccountHeader title="Saved Addresses" />
      <main className="mx-auto w-full max-w-xl space-y-3 p-3">
        <Link
          href="/account/addresses/new"
          className="flex items-center gap-2 rounded-xl border border-dashed border-brand bg-surface px-4 py-3.5 text-sm font-bold text-brand"
        >
          <Plus className="size-4" />
          Add a new address
        </Link>

        {addresses.length === 0 ? (
          <EmptyState
            icon={<span>📍</span>}
            title="No saved addresses"
            description="Add an address to speed up checkout later."
          />
        ) : (
          addresses.map((a) => (
            <AddressCard
              key={a.id}
              labelText={labelText(a)}
              addressLine={addressLine(a)}
              recipient={
                a.recipientName
                  ? `${a.recipientName}${a.recipientPhone ? ` · ${a.recipientPhone}` : ""}`
                  : null
              }
              isDefault={a.isDefault}
              actions={
                <>
                  <Link
                    href={`/account/addresses/${a.id}`}
                    className="text-xs font-bold text-brand"
                  >
                    Edit
                  </Link>
                  {!a.isDefault ? (
                    <form action={setDefaultAddressAction.bind(null, a.id)}>
                      <button type="submit" className="text-xs font-bold text-ink">
                        Set default
                      </button>
                    </form>
                  ) : null}
                  <form
                    action={deleteAddressAction.bind(null, a.id)}
                    className="ml-auto"
                  >
                    <button type="submit" className="text-xs font-bold text-danger">
                      Delete
                    </button>
                  </form>
                </>
              }
            />
          ))
        )}
      </main>
    </div>
  );
}
