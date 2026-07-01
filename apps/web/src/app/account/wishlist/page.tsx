import Link from "next/link";
import { Heart } from "lucide-react";
import { EmptyState, ProductCard } from "@suplaykart/ui";
import { db, listWishlist } from "@suplaykart/db";
import { AccountHeader } from "@/components/account-header";
import { CartControl } from "@/components/cart-control";
import { WishlistHeart } from "@/components/wishlist-heart";
import { toProductCard } from "@/lib/mappers";
import { requireCurrentUser } from "@/lib/auth";
import { currentCart } from "@/lib/cart";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await requireCurrentUser();
  const [items, { quantities }] = await Promise.all([
    listWishlist(db, user.id),
    currentCart(),
  ]);

  return (
    <div className="min-h-screen bg-surface-alt pb-8">
      <AccountHeader title={`Wishlist${items.length ? ` (${items.length})` : ""}`} />
      {items.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-8 text-brand" />}
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here."
          action={
            <Link
              href="/"
              className="flex h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white"
            >
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((p) => (
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
                <WishlistHeart variantId={p.variantId} initial={true} />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
