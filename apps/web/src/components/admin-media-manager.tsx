"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Star, Trash2, Upload } from "lucide-react";
import { MAX_IMAGE_BYTES, isAllowedImageType } from "@/lib/storage/limits";
import {
  confirmProductImageUpload,
  deleteProductImageAction,
  reorderProductImagesAction,
  requestProductImageUpload,
  setPrimaryProductImageAction,
} from "@/app/admin/products/[id]/images/actions";

interface Img {
  id: string;
  url: string;
  alt: string | null;
}

function reordered(imgs: Img[], from: number, to: number): string[] {
  const ids = imgs.map((i) => i.id);
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved!);
  return ids;
}

export function AdminMediaManager({
  productId,
  images,
  isConfigured,
}: {
  productId: string;
  images: Img[];
  isConfigured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (!isConfigured) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center">
          <div className="text-3xl">🖼️</div>
          <h2 className="mt-2 text-sm font-extrabold text-ink">
            Image storage not configured
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted">
            Set the Cloudflare R2 environment variables to enable uploads — see{" "}
            <span className="font-semibold">docs/guides/phase-2a-r2-setup.md</span>.
            The storefront shows emoji placeholders until then.
          </p>
        </div>
      </div>
    );
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!isAllowedImageType(file.type)) {
          setError("Use JPG, PNG, WebP or AVIF.");
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          setError(`${file.name} is larger than 5 MB.`);
          continue;
        }
        const ticket = await requestProductImageUpload(
          productId,
          file.type,
          file.size,
        );
        if (!ticket.ok) {
          setError(ticket.error);
          continue;
        }
        const put = await fetch(ticket.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "content-type": file.type },
        });
        if (!put.ok) {
          setError(`Upload failed for ${file.name}.`);
          continue;
        }
        const saved = await confirmProductImageUpload(
          productId,
          ticket.publicUrl,
          file.name,
        );
        if (!saved.ok) setError(saved.error ?? "Could not save the image.");
      }
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const run = (fn: () => Promise<void>) => {
    setBusy(true);
    fn()
      .then(() => router.refresh())
      .finally(() => setBusy(false));
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <button
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-dashed border-brand bg-brand-light px-4 py-4 text-sm font-bold text-brand disabled:opacity-50"
        >
          <Upload className="size-4" /> {busy ? "Working…" : "Upload images"}
        </button>
        <p className="mt-1 text-2xs text-muted">
          JPG / PNG / WebP / AVIF · up to 5 MB. The first image is the primary.
        </p>
        {error ? (
          <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        ) : null}
      </div>

      {images.length === 0 ? (
        <p className="rounded-xl border border-border-light bg-surface p-6 text-center text-sm text-muted">
          No images yet — the storefront shows the emoji placeholder.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="overflow-hidden rounded-xl border border-border-light bg-surface"
            >
              <div className="relative aspect-square bg-surface-alt">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt ?? ""}
                  className="size-full object-contain"
                />
                {i === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-2xs font-bold text-white">
                    Primary
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <button
                  disabled={busy || i === 0}
                  title="Set as primary"
                  onClick={() =>
                    run(() => setPrimaryProductImageAction(productId, img.id))
                  }
                  className="grid size-7 place-items-center rounded-lg text-muted hover:text-brand disabled:opacity-30"
                >
                  <Star className="size-4" />
                </button>
                <div className="flex">
                  <button
                    disabled={busy || i === 0}
                    title="Move up"
                    onClick={() =>
                      run(() =>
                        reorderProductImagesAction(
                          productId,
                          reordered(images, i, i - 1),
                        ),
                      )
                    }
                    className="grid size-7 place-items-center rounded-lg text-muted hover:text-ink disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    disabled={busy || i === images.length - 1}
                    title="Move down"
                    onClick={() =>
                      run(() =>
                        reorderProductImagesAction(
                          productId,
                          reordered(images, i, i + 1),
                        ),
                      )
                    }
                    className="grid size-7 place-items-center rounded-lg text-muted hover:text-ink disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                </div>
                <button
                  disabled={busy}
                  title="Delete"
                  onClick={() =>
                    run(() => deleteProductImageAction(productId, img.id))
                  }
                  className="grid size-7 place-items-center rounded-lg text-danger hover:opacity-80 disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
