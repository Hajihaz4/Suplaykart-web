import { adminListCustomers, db } from "@suplaykart/db";
import { formatDate } from "@suplaykart/ui";
import { AdminPageHeader, DataTable, Pill, Td } from "@/components/admin-ui";
import { AdminBlockCustomer } from "@/components/admin-block-customer";

export const dynamic = "force-dynamic";

export default async function AdminCustomers() {
  const rows = await adminListCustomers(db);

  return (
    <>
      <AdminPageHeader
        title="Customers"
        description={`${rows.length} customers`}
      />
      <div className="p-4 md:p-6">
        <DataTable
          cols={["Name", "Phone", "Email", "Orders", "Joined", ""]}
          empty={rows.length === 0}
        >
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-surface-alt">
              <Td className="font-semibold">{c.name ?? "—"}</Td>
              <Td className="text-muted">{c.phone}</Td>
              <Td className="text-muted">{c.email ?? "—"}</Td>
              <Td>{c.orderCount}</Td>
              <Td className="text-muted">{formatDate(c.joinedAt)}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  {c.isBlocked ? <Pill tone="danger">Blocked</Pill> : null}
                  <AdminBlockCustomer userId={c.id} blocked={c.isBlocked} />
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}
