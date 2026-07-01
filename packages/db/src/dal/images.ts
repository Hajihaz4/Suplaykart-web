import { and, asc, eq } from "drizzle-orm";
import type { DB } from "../client";
import { productImages, products } from "../schema";

export type ProductImage = typeof productImages.$inferSelect;

export interface NewProductImage {
  productId: string;
  url: string;
  alt?: string | null;
  variantId?: string | null;
  sortOrder?: number;
}

export async function listProductImages(
  db: DB,
  productId: string,
): Promise<ProductImage[]> {
  return db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt));
}

/** The primary (lowest sortOrder) image URL for a product, or null. */
export async function getPrimaryImageUrl(
  db: DB,
  productId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt))
    .limit(1);
  return row?.url ?? null;
}

/** Appends an image at the end of the product's gallery (next sortOrder). */
export async function addProductImage(
  db: DB,
  supplierId: string,
  input: NewProductImage,
): Promise<ProductImage | null> {
  return db.transaction(async (tx) => {
    // ownership: the product must belong to this supplier
    const [owner] = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, input.productId),
          eq(products.supplierId, supplierId),
        ),
      )
      .limit(1);
    if (!owner) return null;

    const existing = await tx
      .select({ sortOrder: productImages.sortOrder })
      .from(productImages)
      .where(eq(productImages.productId, input.productId));
    const nextOrder =
      input.sortOrder ??
      existing.reduce((max, r) => Math.max(max, r.sortOrder + 1), 0);

    const [row] = await tx
      .insert(productImages)
      .values({
        productId: input.productId,
        variantId: input.variantId ?? null,
        url: input.url,
        alt: input.alt ?? null,
        sortOrder: nextOrder,
      })
      .returning();
    return row!;
  });
}

/** Deletes an image (ownership-checked) and returns it so the caller can
 * remove the object from storage. */
export async function deleteProductImage(
  db: DB,
  supplierId: string,
  imageId: string,
): Promise<ProductImage | null> {
  return db.transaction(async (tx) => {
    const [img] = await tx
      .select()
      .from(productImages)
      .innerJoin(products, eq(products.id, productImages.productId))
      .where(
        and(
          eq(productImages.id, imageId),
          eq(products.supplierId, supplierId),
        ),
      )
      .limit(1);
    if (!img) return null;
    await tx.delete(productImages).where(eq(productImages.id, imageId));
    return img.product_images;
  });
}

/** Reorders a product's images to match the given id sequence. */
export async function reorderProductImages(
  db: DB,
  supplierId: string,
  productId: string,
  orderedIds: string[],
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [owner] = await tx
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.supplierId, supplierId)))
      .limit(1);
    if (!owner) return false;
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(productImages)
        .set({ sortOrder: i })
        .where(
          and(
            eq(productImages.id, orderedIds[i]!),
            eq(productImages.productId, productId),
          ),
        );
    }
    return true;
  });
}
