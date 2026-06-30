"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { AppShell, EmptyState, ProductCard, SearchHeader } from "@suplaykart/ui";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { PRODUCTS } from "@/lib/mock-data";

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const query = q.trim().toLowerCase();
  const results = query
    ? PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          Boolean(p.brand?.toLowerCase().includes(query)),
      )
    : PRODUCTS;

  return (
    <AppShell
      header={
        <SearchHeader
          value={q}
          onValueChange={setQ}
          onBack={() => router.back()}
          autoFocus
        />
      }
      bottomNav={<AppBottomNav />}
    >
      <div className="px-3 pt-3 text-xs font-semibold text-muted">
        {query ? `${results.length} results for “${q}”` : "Popular products"}
      </div>
      {results.length === 0 ? (
        <EmptyState
          icon={<Search className="size-8 text-brand" />}
          title="No results found"
          description="Try a different product, brand, or keyword."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              href={`/products/${p.slug}`}
              linkComponent={Link}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
