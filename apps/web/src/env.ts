import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Typed, validated environment access (per ADR 0001).
 * Set SKIP_ENV_VALIDATION=1 to bypass during credential-less CI builds.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string().min(1),
    // Required only for the Clerk → DB webhook; optional elsewhere.
    CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),
    // Cloudflare R2 (Phase 2a). All optional — image storage gracefully
    // disables when unset, so the app builds/runs without credentials.
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    // Public base URL for serving R2 objects (r2.dev or a custom domain).
    NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
