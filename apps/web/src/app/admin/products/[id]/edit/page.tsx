import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  adminListCategories,
  db,
  getProductForEdit,
  requireDefaultSupplier,
} from "@suplaykart/db";
import { AdminProductForm } from "@/components/admin-product-form";
import { updateProductAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await requireDefaultSupplier(db);
  const [product, categories] = await Promise.all([
    getProductForEdit(db, supplier.id, id),
    adminListCategories(db, supplier.id),
  ]);
  if (!product) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border-light bg-surface px-4 py-4 md:px-6">
        <Link
          href="/admin/products"
          className="grid size-8 place-items-center rounded-full bg-surface-alt"
        >
          <ArrowLeft className="size-4 text-ink" />
        </Link>
        <h1 className="text-lg font-extrabold text-ink">Edit {product.name}</h1>
      </div>
      <AdminProductForm
        action={updateProductAction.bind(null, id)}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        submitLabel="Save changes"
        defaults={{
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          categoryId: product.categoryId,
          description: product.description,
          isVeg: product.isVeg,
          emoji: product.emoji,
          priceRupees: product.price / 100,
          mrpRupees: product.mrp != null ? product.mrp / 100 : null,
          unit: product.unit,
        }}
      />
    </div>
  );
}
