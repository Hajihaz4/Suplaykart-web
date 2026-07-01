# Phase 1F — Cart Persistence

**Date:** 2026-07-01 · **Scope:** replace the mock cart with a user-scoped, server-persisted cart. **No checkout/orders yet.**
**Result:** ✅ DB-backed cart (DAL + Server Actions), live badge + product-card + PDP integration, mock data deleted. typecheck 3/3, build green, cart DAL 14/14 (PGlite).

## DAL (`packages/db/src/dal/cart.ts`)
`getCart` (get-or-create) · `getCartItems` (joined display view) · `getCartCount` (badge) · `getCartView` (items + subtotal + itemCount + savings) · `addToCart` (upsert, increments on conflict) · `updateCartQuantity` (0 ⇒ delete) · `removeFromCart` · `clearCart`. All DI + user-scoped (every query joins `carts.userId`). Also threaded `variantId` through the catalog DAL/types so cards know which sellable unit to add.

## Server Actions (`apps/web/src/app/cart/actions.ts`)
`addToCartAction` · `updateCartQuantityAction` · `removeCartItemAction` · `clearCartAction` — each `requireCurrentUser()` → DAL → `revalidatePath("/cart")`.

## UI integration
- **`CartControl`** (client, optimistic `useTransition`): ADD ⇄ quantity stepper, wired to the actions. Rendered on every product card via the new `ProductCard.cartControl` slot (home, search, PDP "similar").
- **`AddToCartBar`** (PDP) rewritten from mock state to the real actions (`variantId` + `initialQty`).
- **Cart badge** is live everywhere via `lib/cart.ts#currentCart()` (0 for guests, real per-variant quantities for authed users).
- **`/cart`** rewritten as a Server Component: real line items, per-line `CartControl`, bill summary (subtotal / savings / delivery / to-pay), clear-cart, checkout CTA, empty state.
- Deleted `lib/mock-data.ts` and `components/cart-view.tsx` (all mock cart behavior removed).

## Verification
```
pnpm typecheck                       → 3/3     exit 0
pnpm build                           → /cart now ƒ dynamic, exit 0
verify:cart (PGlite, 14 assertions)  → exit 0
  add · re-add increments · new line · count=5 · subtotal(paise) · savings
  update qty · qty 0 removes line · per-user isolation (A⊥B) · remove · clear
```
**Persistence across logout/login:** the cart lives in Postgres keyed by `users.id`; `getCurrentUser()` resolves the same row on re-login, so the cart is restored. The DAL test proves per-user isolation + DB persistence; interactive OTP logout/login can't be headless-automated.

## Follow-ups (1G)
Checkout uses `getCartView` for the order draft; `clearCart` runs inside the transactional order-creation after inventory reservation.
