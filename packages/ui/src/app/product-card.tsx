"use client";
import * as React from "react";
import { cn } from "../lib/cn";
import { formatINR, discountPct } from "../lib/format";
import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { QuantityStepper } from "./quantity-stepper";
import type { ProductCardData } from "../types";

export interface ProductCardProps {
  product: ProductCardData;
  href?: string;
  linkComponent?: React.ElementType;
  className?: string;
  /** Live cart control (ADD / stepper). Falls back to a local demo stepper. */
  cartControl?: React.ReactNode;
  /** Wishlist heart, overlaid on the image. */
  wishlistControl?: React.ReactNode;
}

export function ProductCard({
  product,
  href,
  linkComponent: Link = "a",
  className,
  cartControl,
  wishlistControl,
}: ProductCardProps) {
  const [qty, setQty] = React.useState(0);
  const [imgError, setImgError] = React.useState(false);
  const off = product.mrp ? discountPct(product.mrp, product.price) : null;
  const Media: React.ElementType = href ? Link : "div";
  const mediaProps = href ? { href } : {};
  const showImage = Boolean(product.imageUrl) && !imgError;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-border-light bg-surface",
        className,
      )}
    >
      {wishlistControl ? (
        <div className="absolute right-1.5 top-1.5 z-10">{wishlistControl}</div>
      ) : null}
      <Media
        {...mediaProps}
        aria-label={href ? product.name : undefined}
        className="relative grid aspect-square place-items-center bg-surface-alt text-5xl"
      >
        {product.badge ? (
          <span className="absolute left-1.5 top-1.5">
            <Badge variant="solid" size="sm">
              {product.badge}
            </Badge>
          </span>
        ) : null}
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="size-full object-contain"
          />
        ) : (
          <span aria-hidden>{product.image}</span>
        )}
        {product.veg ? (
          <span className="absolute bottom-1.5 right-1.5 grid size-3.5 place-items-center rounded-[3px] border-[1.5px] border-brand bg-white">
            <span className="size-1.5 rounded-full bg-brand" />
          </span>
        ) : null}
      </Media>

      <div className="flex flex-1 flex-col p-2">
        <div className="text-2xs font-semibold text-muted">{product.unit}</div>
        {product.available != null && product.available <= 5 ? (
          <div
            className={`text-2xs font-bold ${
              product.available <= 0 ? "text-danger" : "text-accent"
            }`}
          >
            {product.available <= 0
              ? "Out of stock"
              : `Only ${product.available} left`}
          </div>
        ) : null}
        <Media
          {...mediaProps}
          className="mt-0.5 line-clamp-2 min-h-8 text-xs font-medium text-ink"
        >
          {product.name}
        </Media>
        {product.rating ? (
          <div className="mt-1 flex items-center gap-1 text-2xs font-semibold text-muted">
            <span className="text-warning">★</span>
            {product.rating}
            {product.ratingCount ? ` (${product.ratingCount})` : ""}
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <div className="text-sm font-extrabold text-ink">
              {formatINR(product.price)}
            </div>
            {product.mrp && off ? (
              <div className="text-2xs text-muted">
                <span className="line-through">{formatINR(product.mrp)}</span>{" "}
                <span className="font-bold text-brand">{off}% off</span>
              </div>
            ) : null}
          </div>
          {cartControl ??
            (qty === 0 ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-3"
                onClick={() => setQty(1)}
              >
                ADD
              </Button>
            ) : (
              <QuantityStepper value={qty} onChange={setQty} size="sm" />
            ))}
        </div>
      </div>
    </div>
  );
}
