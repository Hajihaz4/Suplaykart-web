import Link from "next/link";
import { Plus } from "lucide-react";
import { adminListProducts, db, requireDefaultSupplier } from "@suplaykart/db";
import { formatINR } from "@suplaykart/ui";
import { AdminPageHeader, DataTable, Pill, Td } from "@/components/admin-ui";
import { AdminToggle } from "@/components/admin-toggle";
import { toggleProductActiveAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const supplier = await requireDefaultSupplier(db);
  const rows = await adminListProducts(db, supplier.id);

  return (
    <>
      <AdminPageHeader
        title="Products"
        description={`${rows.length} products`}
        action={
          <Link
            href="/admin/products/new"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-bold text-white"
          >
            <Plus className="size-4" /> New product
          </Link>
        }
      />
      <div className="p-4 md:p-6">
        <DataTable
          cols={["Product", "Category", "Price", "Stock", "Status", ""]}
          empty={rows.length === 0}
        >
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-surface-alt">
              <Td>
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="font-semibold text-brand"
                >
                  {p.name}
                </Link>
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
              <Td>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="text-2xs font-bold text-brand"
                  >
                    Edit
                  </Link>
                  <AdminToggle
                    id={p.id}
                    active={p.isActive}
                    action={toggleProductActiveAction}
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
