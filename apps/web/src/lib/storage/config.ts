import "server-only";
import { env } from "@/env";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Public base URL (no trailing slash) for serving objects. */
  publicUrl: string;
}

/**
 * Returns the R2 configuration, or `null` when any required value is missing.
 * Every storage entry point checks this, so the app degrades gracefully to the
 * emoji/placeholder behaviour when R2 is not set up.
 */
export function getR2Config(): R2Config | null {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET;
  const publicUrl = env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: publicUrl.replace(/\/+$/, ""),
  };
}

export function isStorageConfigured(): boolean {
  return getR2Config() !== null;
}
