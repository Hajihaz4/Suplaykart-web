import Link from "next/link";
import { CategoryCard, EmptyState, SectionHeader } from "@suplaykart/ui";
import { db, listCategories, requireDefaultSupplier } from "@suplaykart/db";
import { StoreShell } from "@/components/store-shell";
import { toCategoryCard } from "@/lib/mappers";
import { currentCart } from "@/lib/cart";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const supplier = await requireDefaultSupplier(db);
  const [cats, { count: cartCount }] = await Promise.all([
    listCategories(db, supplier.id),
    currentCart(),
  ]);

  return (
    <StoreShell cartCount={cartCount}>
      <section className="min-h-[60vh] bg-surface pb-6">
        <h1 className="sr-only">All categories</h1>
        <SectionHeader title="All categories" />
        {cats.length === 0 ? (
          <EmptyState
            icon={<span>📂</span>}
            title="No categories yet"
            description="Categories will appear here once the catalog is seeded."
          />
        ) : (
          <div className="grid grid-cols-3 gap-2 px-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {cats.map((c) => (
              <CategoryCard
                key={c.id}
                category={toCategoryCard(c)}
                href={`/search?q=${encodeURIComponent(c.name)}`}
                linkComponent={Link}
              />
            ))}
          </div>
        )}
      </section>
    </StoreShell>
  );
}
