import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, ProductCard, discountPct, formatINR } from "@suplaykart/ui";
import { AddToCartBar } from "@/components/add-to-cart-bar";
import { PRODUCTS, getProductBySlug } from "@/lib/mock-data";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const off = product.mrp ? discountPct(product.mrp, product.price) : null;
  const similar = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-surface pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border-light bg-surface px-4 py-3">
        <Link
          href="/"
          aria-label="Back"
          className="grid size-9 place-items-center rounded-full bg-surface-alt"
        >
          <ArrowLeft className="size-4 text-ink" />
        </Link>
        <span className="truncate text-sm font-extrabold text-ink">
          {product.brand ?? "Product"}
        </span>
      </header>

      <div className="mx-auto w-full max-w-3xl">
        <div className="grid place-items-center bg-surface-alt py-12 text-[120px] leading-none">
          <span aria-hidden>{product.image}</span>
        </div>

        <div className="p-4">
          {product.badge ? (
            <Badge variant="brand" size="sm">
              {product.badge}
            </Badge>
          ) : null}
          <h1 className="mt-2 text-lg font-extrabold leading-snug text-ink">
            {product.name}
          </h1>
          <div className="mt-1 text-xs font-semibold text-muted">
            {product.unit}
            {product.rating
              ? ` · ★ ${product.rating} (${product.ratingCount})`
              : ""}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-black text-ink">
              {formatINR(product.price)}
            </span>
            {product.mrp && off ? (
              <>
                <span className="text-sm text-muted line-through">
                  {formatINR(product.mrp)}
                </span>
                <span className="text-sm font-bold text-brand">{off}% off</span>
              </>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Inclusive of all taxes. This is mock product copy for the Phase 1C UI
            foundation — real product details arrive in a later phase.
          </p>
        </div>

        <div className="border-t-8 border-surface-alt p-4">
          <h2 className="mb-3 text-base font-extrabold text-ink">
            Similar products
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {similar.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                href={`/products/${p.slug}`}
                linkComponent={Link}
              />
            ))}
          </div>
        </div>
      </div>

      <AddToCartBar price={product.price} />
    </div>
  );
}
