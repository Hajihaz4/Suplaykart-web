import "server-only";
import { randomUUID } from "node:crypto";

export { getR2Config, isStorageConfigured } from "./config";
export {
  deleteObject,
  keyFromPublicUrl,
  objectPublicUrl,
  presignUpload,
  type PresignedUpload,
} from "./r2";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function isAllowedImageType(contentType: string): boolean {
  return ALLOWED.has(contentType);
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Deterministic, collision-safe object key for a product image. */
export function productImageKey(productId: string, contentType: string): string {
  const ext = EXT[contentType] ?? "bin";
  return `products/${productId}/${randomUUID()}.${ext}`;
}
