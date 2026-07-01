import Link from "next/link";
import { Search } from "lucide-react";
import { AppShell, EmptyState, ProductCard } from "@suplaykart/ui";
import {
  db,
  listFeaturedProducts,
  requireDefaultSupplier,
  searchProducts,
} from "@suplaykart/db";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { SearchBox } from "@/components/search-box";
import { toProductCard } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const supplier = await requireDefaultSupplier(db);
  const results = query
    ? await searchProducts(db, supplier.id, query, 30)
    : await listFeaturedProducts(db, supplier.id, 12);

  return (
    <AppShell
      header={<SearchBox initialQuery={query} />}
      bottomNav={<AppBottomNav />}
    >
      <div className="px-3 pt-3 text-xs font-semibold text-muted">
        {query
          ? `${results.length} result${results.length === 1 ? "" : "s"} for “${query}”`
          : "Popular products"}
      </div>
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
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
