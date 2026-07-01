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
    // Web Push VAPID (Phase 2A). Optional — push gracefully disables when unset.
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().optional(),
    // Razorpay (Phase 2I). Optional — online payments disable gracefully; the
    // store operates on COD / UPI-on-delivery without these.
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    // Public base URL for serving R2 objects (r2.dev or a custom domain).
    NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url().optional(),
    // VAPID public key (needed client-side to subscribe to push).
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
    // Mapbox public token for the address map picker / static maps (Phase 2B).
    NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
