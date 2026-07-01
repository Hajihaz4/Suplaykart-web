import { adminListCategories, db, requireDefaultSupplier } from "@suplaykart/db";
import { AdminPageHeader, DataTable, Pill, Td } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const supplier = await requireDefaultSupplier(db);
  const rows = await adminListCategories(db, supplier.id);

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description={`${rows.length} categories`}
      />
      <div className="p-4 md:p-6">
        <DataTable
          cols={["#", "Category", "Slug", "Products", "Status"]}
          empty={rows.length === 0}
        >
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-surface-alt">
              <Td className="text-muted">{c.sortOrder}</Td>
              <Td>
                <span className="mr-2">{c.icon ?? "🛒"}</span>
                <span className="font-semibold text-ink">{c.name}</span>
              </Td>
              <Td className="text-muted">{c.slug}</Td>
              <Td>{c.productCount}</Td>
              <Td>
                <Pill tone={c.isActive ? "brand" : "muted"}>
                  {c.isActive ? "Active" : "Hidden"}
                </Pill>
              </Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}
