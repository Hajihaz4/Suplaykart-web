import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  db,
  getProductForEdit,
  listProductImages,
  requireDefaultSupplier,
} from "@suplaykart/db";
import { isStorageConfigured } from "@/lib/storage";
import { AdminMediaManager } from "@/components/admin-media-manager";

export const dynamic = "force-dynamic";

export default async function ProductImagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await requireDefaultSupplier(db);
  const product = await getProductForEdit(db, supplier.id, id);
  if (!product) notFound();
  const images = await listProductImages(db, id);

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border-light bg-surface px-4 py-4 md:px-6">
        <Link
          href={`/admin/products/${id}/edit`}
          className="grid size-8 place-items-center rounded-full bg-surface-alt"
        >
          <ArrowLeft className="size-4 text-ink" />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold text-ink">
            Images — {product.name}
          </h1>
          <div className="text-2xs text-muted">
            {images.length} image{images.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      <AdminMediaManager
        productId={id}
        images={images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }))}
        isConfigured={isStorageConfigured()}
      />
    </div>
  );
}
