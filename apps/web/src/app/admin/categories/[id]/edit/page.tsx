import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db, getCategoryForEdit, requireDefaultSupplier } from "@suplaykart/db";
import { AdminCategoryForm } from "@/components/admin-category-form";
import { updateCategoryAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await requireDefaultSupplier(db);
  const category = await getCategoryForEdit(db, supplier.id, id);
  if (!category) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border-light bg-surface px-4 py-4 md:px-6">
        <Link
          href="/admin/categories"
          className="grid size-8 place-items-center rounded-full bg-surface-alt"
        >
          <ArrowLeft className="size-4 text-ink" />
        </Link>
        <h1 className="text-lg font-extrabold text-ink">Edit {category.name}</h1>
      </div>
      <AdminCategoryForm
        action={updateCategoryAction.bind(null, id)}
        submitLabel="Save changes"
        defaults={{
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          sortOrder: category.sortOrder,
        }}
      />
    </div>
  );
}
