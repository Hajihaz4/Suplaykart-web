import Link from "next/link";
import { Search } from "lucide-react";
import {
  AddressChip,
  CategoryCard,
  EmptyState,
  ProductCard,
  SectionHeader,
  StoreStatusBanner,
} from "@suplaykart/ui";
import {
  db,
  getCategoryBySlug,
  listCategories,
  listFeaturedProducts,
  listNewArrivals,
  listProductsByCategory,
  requireDefaultSupplier,
} from "@suplaykart/db";
import { StoreShell } from "@/components/store-shell";
import { CartControl } from "@/components/cart-control";
import { toCategoryCard, toProductCard } from "@/lib/mappers";
import { currentCart } from "@/lib/cart";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supplier = await requireDefaultSupplier(db);
  const snacks = await getCategoryBySlug(db, supplier.id, "chips-namkeen");
  const [cats, featured, newArrivals, snackProducts, cart] = await Promise.all([
    listCategories(db, supplier.id),
    listFeaturedProducts(db, supplier.id, 6),
    listNewArrivals(db, supplier.id, 6),
    snacks
      ? listProductsByCategory(db, supplier.id, snacks.id, 6)
      : Promise.resolve([]),
    currentCart(),
  ]);
  const { count: cartCount, quantities } = cart;

  const sections = [
    { title: "Featured products", items: featured },
    { title: "New arrivals ✨", items: newArrivals },
    ...(snackProducts.length
      ? [{ title: "Snacks & Namkeen", items: snackProducts }]
      : []),
  ];
  const emptyStore = cats.length === 0 && featured.length === 0;

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
            <StoreStatusBanner
              status="open"
              etaText="Delivering in 22 mins · Nagore"
            />
            <AddressChip
              label="Home"
              address="Main Road, Nagore — 611002"
              href="/account"
              linkComponent={Link}
            />
          </div>
        </div>

        {emptyStore ? (
          <EmptyState
            icon={<span>🏪</span>}
            title="Store is being set up"
            description="Products will appear here once the catalog is seeded."
          />
        ) : (
          <>
            {cats.length > 0 && (
              <section className="bg-surface pb-2">
                <SectionHeader
                  title="Shop by category"
                  actionLabel="See all"
                  actionHref="/categories"
                  linkComponent={Link}
                />
                <div className="grid grid-cols-4 gap-1 px-2 md:grid-cols-6 lg:grid-cols-8">
                  {cats.slice(0, 8).map((c) => (
                    <CategoryCard
                      key={c.id}
                      category={toCategoryCard(c)}
                      href={`/search?q=${encodeURIComponent(c.name)}`}
                      linkComponent={Link}
                    />
                  ))}
                </div>
              </section>
            )}

            {sections.map((s) =>
              s.items.length ? (
                <section key={s.title} className="bg-surface pb-3">
                  <SectionHeader
                    title={s.title}
                    actionLabel="See all"
                    actionHref="/categories"
                    linkComponent={Link}
                  />
                  <div className="grid grid-cols-2 gap-2 px-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {s.items.map((p) => (
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
                </section>
              ) : null,
            )}
          </>
        )}
      </div>
    </StoreShell>
  );
}
