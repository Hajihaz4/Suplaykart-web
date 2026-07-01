"use server";
import { revalidatePath } from "next/cache";
import {
  addProductImage,
  db,
  deleteProductImage,
  getProductForEdit,
  listProductImages,
  reorderProductImages,
  requireDefaultSupplier,
} from "@suplaykart/db";
import { requireAdmin } from "@/lib/auth";
import {
  MAX_IMAGE_BYTES,
  deleteObject,
  isAllowedImageType,
  keyFromPublicUrl,
  presignUpload,
  productImageKey,
} from "@/lib/storage";

export type UploadTicket =
  | { ok: true; uploadUrl: string; publicUrl: string; key: string }
  | { ok: false; error: string };

function revalidateProduct(productId: string) {
  revalidatePath(`/admin/products/${productId}/images`);
  revalidatePath("/admin/products");
}

/** Validate + presign a direct browser→R2 upload for one image. */
export async function requestProductImageUpload(
  productId: string,
  contentType: string,
  size: number,
): Promise<UploadTicket> {
  await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  if (!isAllowedImageType(contentType))
    return { ok: false, error: "Unsupported type. Use JPG, PNG, WebP or AVIF." };
  if (size > MAX_IMAGE_BYTES)
    return { ok: false, error: "Image is larger than 5 MB." };

  const product = await getProductForEdit(db, supplier.id, productId);
  if (!product) return { ok: false, error: "Product not found." };

  const presigned = await presignUpload(
    productImageKey(productId, contentType),
    contentType,
  );
  if (!presigned) return { ok: false, error: "Image storage is not configured." };
  return {
    ok: true,
    uploadUrl: presigned.uploadUrl,
    publicUrl: presigned.publicUrl,
    key: presigned.key,
  };
}

/** Record an uploaded image (ownership-enforced in the DAL). */
export async function confirmProductImageUpload(
  productId: string,
  publicUrl: string,
  alt?: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  const row = await addProductImage(db, supplier.id, {
    productId,
    url: publicUrl,
    alt: alt ?? null,
  });
  if (!row) return { ok: false, error: "Could not save the image." };
  revalidateProduct(productId);
  return { ok: true };
}

export async function deleteProductImageAction(
  productId: string,
  imageId: string,
): Promise<void> {
  await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  const removed = await deleteProductImage(db, supplier.id, imageId);
  if (removed) {
    const key = keyFromPublicUrl(removed.url);
    if (key) {
      try {
        await deleteObject(key);
      } catch {
        // best-effort object cleanup; the DB row is already gone
      }
    }
  }
  revalidateProduct(productId);
}

export async function reorderProductImagesAction(
  productId: string,
  orderedIds: string[],
): Promise<void> {
  await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  await reorderProductImages(db, supplier.id, productId, orderedIds);
  revalidateProduct(productId);
}

export async function setPrimaryProductImageAction(
  productId: string,
  imageId: string,
): Promise<void> {
  await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  const imgs = await listProductImages(db, productId);
  const ordered = [
    imageId,
    ...imgs.map((i) => i.id).filter((id) => id !== imageId),
  ];
  await reorderProductImages(db, supplier.id, productId, ordered);
  revalidateProduct(productId);
}
