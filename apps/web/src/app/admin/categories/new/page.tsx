import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminCategoryForm } from "@/components/admin-category-form";

export const dynamic = "force-dynamic";

export default function NewCategoryPage() {
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border-light bg-surface px-4 py-4 md:px-6">
        <Link
          href="/admin/categories"
          className="grid size-8 place-items-center rounded-full bg-surface-alt"
        >
          <ArrowLeft className="size-4 text-ink" />
        </Link>
        <h1 className="text-lg font-extrabold text-ink">New category</h1>
      </div>
      <AdminCategoryForm mode="create" submitLabel="Create category" />
    </div>
  );
}
