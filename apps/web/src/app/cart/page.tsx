import { SectionHeader } from "@suplaykart/ui";
import { StoreShell } from "@/components/store-shell";
import { CartView } from "@/components/cart-view";
import { CART_LINES } from "@/lib/mock-data";

const cartCount = CART_LINES.reduce((n, l) => n + l.qty, 0);

export default function CartPage() {
  return (
    <StoreShell cartCount={cartCount}>
      <SectionHeader title="Your cart" />
      <CartView />
    </StoreShell>
  );
}
