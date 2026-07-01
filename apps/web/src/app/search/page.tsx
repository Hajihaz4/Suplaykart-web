import Link from "next/link";
import { Search } from "lucide-react";
import { AppShell, EmptyState, ProductCard } from "@suplaykart/ui";
import {
  db,
  listFeaturedProducts,
  requireDefaultSupplier,
  searchFacets,
  searchProducts,
} from "@suplaykart/db";
import type { SearchSort } from "@suplaykart/db";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { CartControl } from "@/components/cart-control";
import { WishlistHeart } from "@/components/wishlist-heart";
import { SearchBox } from "@/components/search-box";
import { RecordSearch } from "@/components/record-search";
import { toProductCard } from "@/lib/mappers";
import { currentCart } from "@/lib/cart";
import { currentWishlist } from "@/lib/wishlist";
import { getSearchHistory } from "@/lib/search-history";

export const dynamic = "force-dynamic";

const SORTS: { key: SearchSort; label: string }[] = [
  { key: "relevance", label: "Relevance" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
  { key: "rating", label: "Top rated" },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const { q, category, sort } = await searchParams;
  const query = (q ?? "").trim();
  const activeSort = (SORTS.find((s) => s.key === sort)?.key ??
    "relevance") as SearchSort;
  const supplier = await requireDefaultSupplier(db);

  const [results, facets, { quantities }, wishlist, history] = await Promise.all([
    query
      ? searchProducts(db, supplier.id, query, {
          categorySlug: category,
          sort: activeSort,
          limit: 30,
        })
      : listFeaturedProducts(db, supplier.id, 12),
    query ? searchFacets(db, supplier.id, query) : Promise.resolve([]),
    currentCart(),
    currentWishlist(),
    query ? Promise.resolve([]) : getSearchHistory(),
  ]);

  const qs = (over: { category?: string | null; sort?: string }) => {
    const p = new URLSearchParams();
    p.set("q", query);
    const cat = over.category === undefined ? category : over.category;
    if (cat) p.set("category", cat);
    const so = over.sort ?? activeSort;
    if (so !== "relevance") p.set("sort", so);
    return `/search?${p.toString()}`;
  };

  return (
    <AppShell
      header={<SearchBox initialQuery={query} />}
      bottomNav={<AppBottomNav />}
    >
      <h1 className="sr-only">Search products</h1>
      {query ? <RecordSearch q={query} /> : null}

      {/* history (empty query) */}
      {!query && history.length > 0 ? (
        <div className="px-3 pt-3">
          <div className="text-2xs font-bold uppercase tracking-wide text-muted">
            Recent searches
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {history.map((h) => (
              <Link
                key={h}
                href={`/search?q=${encodeURIComponent(h)}`}
                className="rounded-full bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink"
              >
                {h}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="px-3 pt-3 text-xs font-semibold text-muted">
        {query
          ? `${results.length} result${results.length === 1 ? "" : "s"} for “${query}”`
          : "Popular products"}
      </div>

      {/* facets + sort */}
      {query && results.length > 0 ? (
        <div className="space-y-1.5 px-3 pt-2">
          {facets.length > 1 ? (
            <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
              <Link
                href={qs({ category: null })}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-2xs font-bold ${
                  !category ? "bg-brand text-white" : "bg-surface-alt text-muted"
                }`}
              >
                All
              </Link>
              {facets.map((f) => (
                <Link
                  key={f.slug}
                  href={qs({ category: f.slug })}
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-2xs font-bold ${
                    category === f.slug
                      ? "bg-brand text-white"
                      : "bg-surface-alt text-muted"
                  }`}
                >
                  {f.name} ({f.count})
                </Link>
              ))}
            </div>
          ) : null}
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={qs({ sort: s.key })}
                className={`whitespace-nowrap rounded-full border px-3 py-1 text-2xs font-bold ${
                  activeSort === s.key
                    ? "border-brand text-brand"
                    : "border-border-light text-muted"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {results.length === 0 ? (
        <EmptyState
          icon={<Search className="size-8 text-brand" />}
          title="No results found"
          description="Try a different product, brand, or category."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((p) => (
            <ProductCard
              key={p.id}
              product={toProductCard(p)}
              href={`/products/${p.slug}`}
              linkComponent={Link}
              cartControl={
                <CartControl
                  key={p.variantId}
                  variantId={p.variantId}
                  initialQty={quantities[p.variantId] ?? 0}
                />
              }
              wishlistControl={
                wishlist.authed ? (
                  <WishlistHeart
                    variantId={p.variantId}
                    initial={wishlist.ids.has(p.variantId)}
                  />
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
