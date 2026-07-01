import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { adminListCategories, db, requireDefaultSupplier } from "@suplaykart/db";
import { AdminProductForm } from "@/components/admin-product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const supplier = await requireDefaultSupplier(db);
  const categories = await adminListCategories(db, supplier.id);

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border-light bg-surface px-4 py-4 md:px-6">
        <Link
          href="/admin/products"
          className="grid size-8 place-items-center rounded-full bg-surface-alt"
        >
          <ArrowLeft className="size-4 text-ink" />
        </Link>
        <h1 className="text-lg font-extrabold text-ink">New product</h1>
      </div>
      <AdminProductForm
        mode="create"
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        submitLabel="Create product"
      />
    </div>
  );
}
