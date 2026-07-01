import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, ProductCard, discountPct, formatINR } from "@suplaykart/ui";
import {
  db,
  getProductDetailBySlug,
  listFeaturedProducts,
  requireDefaultSupplier,
} from "@suplaykart/db";
import { AddToCartBar } from "@/components/add-to-cart-bar";
import { CartControl } from "@/components/cart-control";
import { toProductCard } from "@/lib/mappers";
import { currentCart } from "@/lib/cart";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supplier = await requireDefaultSupplier(db);
  const product = await getProductDetailBySlug(db, supplier.id, slug);
  if (!product) return { title: "Product not found" };
  const title = product.brand ? `${product.name} — ${product.brand}` : product.name;
  const description =
    product.description ??
    `Buy ${product.name} (${product.unit}) online at ${SITE_NAME}. Delivered in minutes.`;
  return {
    title,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: { title, description, type: "website", url: `${SITE_URL}/products/${slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supplier = await requireDefaultSupplier(db);
  const product = await getProductDetailBySlug(db, supplier.id, slug);
  if (!product) notFound();

  const off = product.mrp ? discountPct(product.mrp, product.price) : null;
  const [similarAll, { quantities }] = await Promise.all([
    listFeaturedProducts(db, supplier.id, 8),
    currentCart(),
  ]);
  const similar = similarAll.filter((p) => p.id !== product.id).slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (product.price / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/products/${slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-surface pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border-light bg-surface px-4 py-3">
        <Link
          href="/"
          aria-label="Back"
          className="grid size-9 place-items-center rounded-full bg-surface-alt"
        >
          <ArrowLeft className="size-4 text-ink" />
        </Link>
        <span className="truncate text-sm font-extrabold text-ink">
          {product.brand ?? product.categoryName ?? "Product"}
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
              ? ` · ★ ${product.rating}${product.ratingCount ? ` (${product.ratingCount})` : ""}`
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
            {product.description ??
              "Inclusive of all taxes. Fresh from the Suplaykart store."}
          </p>
        </div>

        {similar.length > 0 ? (
          <div className="border-t-8 border-surface-alt p-4">
            <h2 className="mb-3 text-base font-extrabold text-ink">
              Similar products
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {similar.map((p) => (
                <ProductCard
                  key={p.id}
                  product={toProductCard(p)}
                  href={`/products/${p.slug}`}
                  linkComponent={Link}
                  cartControl={
                    <CartControl
                      variantId={p.variantId}
                      initialQty={quantities[p.variantId] ?? 0}
                    />
                  }
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <AddToCartBar
        variantId={product.variantId}
        price={product.price}
        initialQty={quantities[product.variantId] ?? 0}
      />
    </div>
  );
}
