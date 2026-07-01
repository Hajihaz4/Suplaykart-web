import Link from "next/link";
import { Plus } from "lucide-react";
import { adminListCategories, db, requireDefaultSupplier } from "@suplaykart/db";
import { AdminPageHeader, DataTable, Pill, Td } from "@/components/admin-ui";
import { AdminToggle } from "@/components/admin-toggle";
import { toggleCategoryActiveAction } from "@/app/admin/mutations";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const supplier = await requireDefaultSupplier(db);
  const rows = await adminListCategories(db, supplier.id);

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description={`${rows.length} categories`}
        action={
          <Link
            href="/admin/categories/new"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-bold text-white"
          >
            <Plus className="size-4" /> New category
          </Link>
        }
      />
      <div className="p-4 md:p-6">
        <DataTable
          cols={["#", "Category", "Slug", "Products", "Status", ""]}
          empty={rows.length === 0}
        >
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-surface-alt">
              <Td className="text-muted">{c.sortOrder}</Td>
              <Td>
                <span className="mr-2">{c.icon ?? "🛒"}</span>
                <Link
                  href={`/admin/categories/${c.id}/edit`}
                  className="font-semibold text-brand"
                >
                  {c.name}
                </Link>
              </Td>
              <Td className="text-muted">{c.slug}</Td>
              <Td>{c.productCount}</Td>
              <Td>
                <Pill tone={c.isActive ? "brand" : "muted"}>
                  {c.isActive ? "Active" : "Hidden"}
                </Pill>
              </Td>
              <Td>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/categories/${c.id}/edit`}
                    className="text-2xs font-bold text-brand"
                  >
                    Edit
                  </Link>
                  <AdminToggle
                    id={c.id}
                    active={c.isActive}
                    action={toggleCategoryActiveAction}
                  />
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}
