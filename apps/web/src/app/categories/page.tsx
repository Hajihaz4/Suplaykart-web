import Link from "next/link";
import { CategoryCard, SectionHeader } from "@suplaykart/ui";
import { StoreShell } from "@/components/store-shell";
import { CART_LINES, CATEGORIES } from "@/lib/mock-data";

const cartCount = CART_LINES.reduce((n, l) => n + l.qty, 0);

export default function CategoriesPage() {
  return (
    <StoreShell cartCount={cartCount}>
      <section className="min-h-[60vh] bg-surface pb-6">
        <SectionHeader title="All categories" />
        <div className="grid grid-cols-3 gap-2 px-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              href="/categories"
              linkComponent={Link}
            />
          ))}
        </div>
      </section>
    </StoreShell>
  );
}
