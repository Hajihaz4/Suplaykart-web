import { adminListProducts, db, requireDefaultSupplier } from "@suplaykart/db";
import { formatINR } from "@suplaykart/ui";
import { AdminPageHeader, DataTable, Pill, Td } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const supplier = await requireDefaultSupplier(db);
  const rows = await adminListProducts(db, supplier.id);

  return (
    <>
      <AdminPageHeader
        title="Products"
        description={`${rows.length} products`}
      />
      <div className="p-4 md:p-6">
        <DataTable
          cols={["Product", "Category", "Price", "Stock", "Status"]}
          empty={rows.length === 0}
        >
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-surface-alt">
              <Td>
                <div className="font-semibold text-ink">{p.name}</div>
                {p.brand ? (
                  <div className="text-2xs text-muted">{p.brand}</div>
                ) : null}
              </Td>
              <Td className="text-muted">{p.categoryName ?? "—"}</Td>
              <Td className="font-semibold">{formatINR(p.price)}</Td>
              <Td>
                <Pill tone={p.stock <= 5 ? "danger" : "muted"}>
                  {p.stock} left
                </Pill>
              </Td>
              <Td>
                <Pill tone={p.isActive ? "brand" : "muted"}>
                  {p.isActive ? "Active" : "Hidden"}
                </Pill>
              </Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}
