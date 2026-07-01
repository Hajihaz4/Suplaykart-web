import { adminListAddresses, db } from "@suplaykart/db";
import { AdminPageHeader, DataTable, Pill, Td } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  home: "Home",
  work: "Work",
  other: "Other",
};

export default async function AdminAddresses() {
  const rows = await adminListAddresses(db);

  return (
    <>
      <AdminPageHeader
        title="Addresses"
        description={`${rows.length} saved addresses`}
      />
      <div className="p-4 md:p-6">
        <DataTable
          cols={["Customer", "Label", "Address", "City", "Pincode"]}
          empty={rows.length === 0}
        >
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-surface-alt">
              <Td>
                {r.customerName ?? "—"}
                <div className="text-2xs text-muted">{r.customerPhone}</div>
              </Td>
              <Td>
                <Pill>{LABELS[r.label] ?? r.label}</Pill>
              </Td>
              <Td className="text-muted">
                {[r.house, r.area].filter(Boolean).join(", ")}
              </Td>
              <Td>{r.city}</Td>
              <Td className="text-muted">{r.pincode}</Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}
