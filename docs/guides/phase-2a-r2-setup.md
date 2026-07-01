# Phase 2a — Product Image System (Cloudflare R2) · Setup

The image-storage system is built and **degrades gracefully**: with no R2
credentials the app builds and runs exactly as before (emoji placeholders). Set
the env vars below to activate real image storage + serving. Upload UI (the
admin media manager) lands in Phase 2b and uses this foundation.

## What's in place
- `apps/web/src/lib/storage/` — R2 client (S3-compatible): `presignUpload`,
  `deleteObject`, `objectPublicUrl`, `keyFromPublicUrl`, `productImageKey`,
  `isStorageConfigured`, type/size guards (`isAllowedImageType`, `MAX_IMAGE_BYTES`).
- `packages/db/src/dal/images.ts` — `listProductImages`, `getPrimaryImageUrl`,
  `addProductImage`, `deleteProductImage`, `reorderProductImages` (all
  supplier-ownership enforced). Tested via PGlite (`packages/db/test/images.test.ts`).
- `next.config.ts` — `images.remotePatterns` auto-derives from `NEXT_PUBLIC_R2_PUBLIC_URL`.
- `ProductCard` renders a real `imageUrl` (with automatic emoji fallback on error).

## Haji: create the bucket + credentials

Requires the Cloudflare `wrangler` CLI (`npm i -g wrangler`) and a Cloudflare account.

```bash
# 1. Log in
wrangler login

# 2. Create the bucket
wrangler r2 bucket create suplaykart-images

# 3. Enable public access (r2.dev dev URL) — or attach a custom domain in the dashboard
#    Dashboard → R2 → suplaykart-images → Settings → Public access → Allow
#    Copy the public URL, e.g. https://pub-<hash>.r2.dev

# 4. Create an S3 API token (scoped to the bucket, Object Read & Write)
#    Dashboard → R2 → Manage R2 API Tokens → Create API token
#    Note the Access Key ID, Secret Access Key, and your Account ID
```

## Add to `apps/web/.env.local`
```
R2_ACCOUNT_ID=<your-account-id>
R2_ACCESS_KEY_ID=<access-key-id>
R2_SECRET_ACCESS_KEY=<secret-access-key>
R2_BUCKET=suplaykart-images
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

(For production, set the same vars in the host's environment.)

## CORS (needed for direct browser uploads in 2b)
In the R2 bucket → Settings → CORS policy:
```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://<your-domain>"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

## Verify activation
1. Restart `pnpm dev` after setting the env vars.
2. `isStorageConfigured()` returns true → the Phase-2b media manager enables uploads.
3. Uploaded images appear on the storefront (ProductCard prefers `imageUrl`,
   falling back to the emoji if the URL fails to load).
