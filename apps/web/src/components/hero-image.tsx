"use client";
import * as React from "react";

/** Product hero: shows the real image, falling back to the emoji on error. */
export function HeroImage({
  src,
  emoji,
  alt,
}: {
  src?: string | null;
  emoji: string;
  alt: string;
}) {
  const [err, setErr] = React.useState(false);
  if (src && !err) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className="max-h-72 w-full object-contain"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <span aria-hidden className="text-[120px] leading-none">
      {emoji}
    </span>
  );
}
