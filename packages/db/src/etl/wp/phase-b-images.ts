/**
 * Phase B — images: rebuild product/category image links from attachment
 * metadata (_thumbnail_id / _product_image_gallery / termmeta thumbnail_id),
 * match to the extracted originals on disk, upload to R2, and insert
 * product_images rows / set categories.imageUrl.
 *
 * Without R2 credentials the phase runs in MANIFEST-ONLY mode: it resolves
 * every link and writes the upload plan, inserting nothing.
 */
import { existsSync, readdirSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { eq } from "drizzle-orm";
import type { DB } from "../../client";
import { categories, productImages } from "../../schema";
import type { WpData } from "./wp-load";
import { mapAll, mapPut } from "./target";
import { bump, warn, type PhaseReport } from "./report";

interface ManifestEntry {
  kind: "product" | "category";
  targetId: string; // our uuid
  wpId: string; // product/term legacy id
  attachmentId: string;
  file: string; // absolute path of the original on disk
  key: string; // R2 object key
  alt: string | null;
  sortOrder: number;
}

function workspace(): string {
  return process.env.WP_WORKSPACE ?? path.join(os.homedir(), "Suplaykart-Migration");
}

/** Index every extracted original by lowercase basename. */
function indexImages(dir: string): Map<string, string> {
  const idx = new Map<string, string>();
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else idx.set(e.name.toLowerCase(), p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return idx;
}

function findFile(idx: Map<string, string>, url: string): string | null {
  const bn = decodeURIComponent(url.split("/").pop() ?? "").toLowerCase();
  if (!bn) return null;
  const direct = idx.get(bn);
  if (direct) return direct;
  const scaled = bn.replace(/(\.[a-z0-9]+)$/, "-scaled$1");
  const unscaled = bn.replace(/-scaled(\.[a-z0-9]+)$/, "$1");
  return idx.get(scaled) ?? idx.get(unscaled) ?? null;
}

function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  );
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export async function runPhaseB(
  db: DB,
  data: WpData,
  report: PhaseReport,
): Promise<void> {
  const idx = indexImages(path.join(workspace(), "images"));
  report.stats.disk_images_indexed = idx.size;

  const prodMap = await mapAll(db, "product");
  const catMap = await mapAll(db, "category");
  const manifest: ManifestEntry[] = [];

  const attachmentUrl = (attId: string): string | null =>
    data.posts.get(attId)?.guid || null;
  const attachmentAlt = (attId: string): string | null =>
    data.posts.get(attId)?.title || null;

  // products: thumbnail first, then gallery
  for (const [wpId, productId] of prodMap) {
    const meta = data.postmeta.get(wpId);
    if (!meta) continue;
    const ids: string[] = [];
    const thumb = meta.get("_thumbnail_id");
    if (thumb) ids.push(thumb);
    for (const g of (meta.get("_product_image_gallery") ?? "").split(","))
      if (g.trim() && !ids.includes(g.trim())) ids.push(g.trim());
    let sort = 0;
    for (const attId of ids) {
      const url = attachmentUrl(attId);
      const file = url ? findFile(idx, url) : null;
      if (!file) {
        warn(report, `product ${wpId}: attachment ${attId} not found on disk`);
        bump(report, "product_images_missing");
        continue;
      }
      manifest.push({
        kind: "product",
        targetId: productId,
        wpId,
        attachmentId: attId,
        file,
        key: `products/${productId}/wc-${attId}${path.extname(file).toLowerCase()}`,
        alt: attachmentAlt(attId),
        sortOrder: sort++,
      });
    }
    if (ids.length === 0) bump(report, "products_without_images");
  }

  // category thumbnails
  for (const [ttId, cat] of data.productCats) {
    void ttId;
    const catId = catMap.get(cat.termId);
    const attId = data.termThumbs.get(cat.termId);
    if (!catId || !attId) continue;
    const url = attachmentUrl(attId);
    const file = url ? findFile(idx, url) : null;
    if (!file) {
      warn(report, `category term ${cat.termId}: thumbnail attachment ${attId} not found on disk`);
      bump(report, "category_images_missing");
      continue;
    }
    manifest.push({
      kind: "category",
      targetId: catId,
      wpId: cat.termId,
      attachmentId: attId,
      file,
      key: `categories/${catId}/wc-${attId}${path.extname(file).toLowerCase()}`,
      alt: null,
      sortOrder: 0,
    });
  }
  report.stats.manifest_entries = manifest.length;

  const outDir = path.join(workspace(), "analysis", "reports");
  mkdirSync(outDir, { recursive: true });
  const manifestPath = path.join(outDir, "phase-b-image-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  report.notes.push(`Upload manifest written to ${manifestPath}`);

  if (report.dryRun) {
    report.notes.push(
      "DRY RUN — manifest resolved only: no uploads, no rows inserted (even if R2 credentials are present).",
    );
    bump(report, "manifest_only", 1);
    return;
  }
  if (!r2Configured()) {
    report.notes.push(
      "R2 credentials absent — MANIFEST-ONLY mode: nothing uploaded, no rows inserted. Set R2_* + NEXT_PUBLIC_R2_PUBLIC_URL and re-run.",
    );
    bump(report, "manifest_only", 1);
    return;
  }

  // upload + insert (idempotent via id_map entity 'image').
  // @aws-sdk/client-s3 is resolved at runtime only (hoisted from apps/web in
  // this workspace); typed structurally so packages/db needs no dependency.
  interface S3Like {
    S3Client: new (cfg: unknown) => { send(cmd: unknown): Promise<unknown> };
    PutObjectCommand: new (input: unknown) => unknown;
  }
  const sdkName = "@aws-sdk/client-s3";
  const { S3Client, PutObjectCommand } = (await import(sdkName)) as unknown as S3Like;
  const { readFileSync } = await import("node:fs");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!.replace(/\/$/, "");
  const imageMap = await mapAll(db, "image");

  for (const m of manifest) {
    const legacyKey = `${m.kind}:${m.wpId}:${m.attachmentId}`;
    if (imageMap.has(legacyKey)) {
      bump(report, "images_skipped_existing");
      continue;
    }
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: m.key,
        Body: readFileSync(m.file),
        ContentType: CONTENT_TYPES[path.extname(m.file).toLowerCase()] ?? "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    const url = `${publicBase}/${m.key}`;
    // row + id_map atomically, so a crash after upload can only re-upload
    // (PUT is idempotent) — never duplicate a product_images row
    await db.transaction(async (rawTx) => {
      const tx = rawTx as unknown as DB;
      if (m.kind === "product") {
        const [row] = await tx
          .insert(productImages)
          .values({ productId: m.targetId, url, alt: m.alt, sortOrder: m.sortOrder })
          .returning({ id: productImages.id });
        await mapPut(tx, "image", legacyKey, row!.id);
      } else {
        await tx.update(categories).set({ imageUrl: url }).where(eq(categories.id, m.targetId));
        await mapPut(tx, "image", legacyKey, m.targetId, "category-image");
      }
    });
    bump(report, "images_uploaded");
  }
}
