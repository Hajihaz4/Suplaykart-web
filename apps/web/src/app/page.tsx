import Link from "next/link";
import { Search } from "lucide-react";
import {
  AddressChip,
  CategoryCard,
  ProductCard,
  SectionHeader,
  StoreStatusBanner,
} from "@suplaykart/ui";
import { StoreShell } from "@/components/store-shell";
import {
  CART_LINES,
  CATEGORIES,
  HOME_SECTIONS,
  getProducts,
} from "@/lib/mock-data";

const cartCount = CART_LINES.reduce((n, l) => n + l.qty, 0);

export default function HomePage() {
  return (
    <StoreShell cartCount={cartCount}>
      <div className="space-y-2">
        <div className="space-y-3 bg-surface px-4 pb-3 pt-2">
          <Link
            href="/search"
            className="flex h-11 items-center gap-2.5 rounded-xl bg-surface-alt px-3.5 text-sm font-medium text-muted-light"
          >
            <Search className="size-4" />
            Search &quot;atta, dal, coke…&quot;
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StoreStatusBanner status="open" etaText="Delivering in 22 mins · Nagore" />
            <AddressChip
              label="Home"
              address="Main Road, Nagore — 611002"
              href="/account"
              linkComponent={Link}
            />
          </div>
        </div>

        <section className="bg-surface pb-2">
          <SectionHeader
            title="Shop by category"
            actionLabel="See all"
            actionHref="/categories"
            linkComponent={Link}
          />
          <div className="grid grid-cols-4 gap-1 px-2 md:grid-cols-6 lg:grid-cols-8">
            {CATEGORIES.slice(0, 8).map((c) => (
              <CategoryCard
                key={c.id}
                category={c}
                href="/categories"
                linkComponent={Link}
              />
            ))}
          </div>
        </section>

        {HOME_SECTIONS.map((section) => (
          <section key={section.title} className="bg-surface pb-3">
            <SectionHeader
              title={section.title}
              actionLabel="See all"
              actionHref={section.actionHref}
              linkComponent={Link}
            />
            <div className="grid grid-cols-2 gap-2 px-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {getProducts(section.productIds).map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  href={`/products/${p.slug}`}
                  linkComponent={Link}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </StoreShell>
  );
}
