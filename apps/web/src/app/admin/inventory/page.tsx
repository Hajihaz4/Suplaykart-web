import { adminListInventory, db, requireDefaultSupplier } from "@suplaykart/db";
import { AdminPageHeader, DataTable, Pill, Td } from "@/components/admin-ui";
import { AdminInventoryAdjust } from "@/components/admin-inventory-adjust";

export const dynamic = "force-dynamic";

export default async function AdminInventory() {
  const supplier = await requireDefaultSupplier(db);
  const rows = await adminListInventory(db, supplier.id);
  const lowCount = rows.filter((r) => r.low).length;

  return (
    <>
      <AdminPageHeader
        title="Inventory"
        description={`${rows.length} variants · ${lowCount} low`}
      />
      <div className="p-4 md:p-6">
        <DataTable
          cols={[
            "Product",
            "Variant",
            "On hand",
            "Reserved",
            "Available",
            "Status",
            "Adjust",
          ]}
          empty={rows.length === 0}
        >
          {rows.map((r) => (
            <tr key={r.variantId} className="hover:bg-surface-alt">
              <Td className="font-semibold">{r.productName}</Td>
              <Td className="text-muted">{r.variantLabel}</Td>
              <Td>{r.onHand}</Td>
              <Td className="text-muted">{r.reserved}</Td>
              <Td className="font-bold">{r.available}</Td>
              <Td>{r.low ? <Pill tone="danger">Low stock</Pill> : null}</Td>
              <Td>
                <AdminInventoryAdjust variantId={r.variantId} />
              </Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}
