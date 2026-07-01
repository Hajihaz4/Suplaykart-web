"use client";
import * as React from "react";
import { X, ZoomIn } from "lucide-react";

interface Img {
  url: string;
  alt: string | null;
}

export function ProductGallery({
  images,
  emoji,
  alt,
}: {
  images: Img[];
  emoji: string;
  alt: string;
}) {
  const [active, setActive] = React.useState(0);
  const [zoom, setZoom] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  if (images.length === 0 || failed) {
    return (
      <div className="grid place-items-center bg-surface-alt py-8">
        <span aria-hidden className="text-[120px] leading-none">
          {emoji}
        </span>
      </div>
    );
  }

  const current = images[active] ?? images[0]!;

  return (
    <div>
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="relative block w-full bg-surface-alt py-4"
        aria-label="Zoom image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={alt}
          className="mx-auto max-h-72 w-full object-contain"
          onError={() => setFailed(true)}
        />
        <span className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-surface/80 text-ink shadow-sm">
          <ZoomIn className="size-4" />
        </span>
      </button>

      {images.length > 1 ? (
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 py-2">
          {images.map((im, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`size-14 shrink-0 overflow-hidden rounded-lg border ${
                i === active ? "border-brand" : "border-border-light"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={im.url}
                alt={im.alt ?? ""}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      {zoom ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          onClick={() => setZoom(false)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/90 text-ink"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={alt}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
