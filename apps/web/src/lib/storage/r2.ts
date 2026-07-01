import "server-only";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Config } from "./config";

let cached: S3Client | null = null;

function bind(): { s3: S3Client; bucket: string; publicUrl: string } | null {
  const cfg = getR2Config();
  if (!cfg) return null;
  if (!cached) {
    cached = new S3Client({
      // R2 is region-agnostic; "auto" + the account endpoint is the R2 spec.
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }
  return { s3: cached, bucket: cfg.bucket, publicUrl: cfg.publicUrl };
}

/** Public URL for an object key, or null when storage is unconfigured. */
export function objectPublicUrl(key: string): string | null {
  const cfg = getR2Config();
  return cfg ? `${cfg.publicUrl}/${key}` : null;
}

export interface PresignedUpload {
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

/**
 * Presigned PUT URL for a direct browser→R2 upload. Returns null when storage
 * is unconfigured. The caller records `publicUrl` in `product_images`.
 */
export async function presignUpload(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<PresignedUpload | null> {
  const c = bind();
  if (!c) return null;
  const cmd = new PutObjectCommand({
    Bucket: c.bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(c.s3, cmd, { expiresIn });
  return { key, uploadUrl, publicUrl: `${c.publicUrl}/${key}` };
}

/** Delete an object by key. No-op (returns false) when unconfigured. */
export async function deleteObject(key: string): Promise<boolean> {
  const c = bind();
  if (!c) return false;
  await c.s3.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: key }));
  return true;
}

/** Recover the object key from a stored public URL (for deletion). */
export function keyFromPublicUrl(url: string): string | null {
  const cfg = getR2Config();
  if (!cfg) return null;
  const prefix = `${cfg.publicUrl}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}
