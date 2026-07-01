# Phase 1H — Customer Order Area

**Date:** 2026-07-01 · **Scope:** customer-facing order list + detail with timeline, items, address, bill, and in-window cancellation. **Reads/cancel already proven in 1G's verify:orders.**
**Result:** ✅ `/account/orders` + `/account/orders/[id]` with loading/empty/not-found states. typecheck 3/3, build green.

## Routes
| Route | Contents |
| --- | --- |
| `/account/orders` | Order list (number, `OrderStatusBadge`, first item + more, item count, total, date). Empty state → "Start shopping". `loading.tsx` skeleton. |
| `/account/orders/[id]` | Ownership-checked (`notFound()` otherwise). Status + **timeline** from `order_status_history`, cancellation-reason banner, items (veg mark, unit × qty), delivery address (snapshot), bill (subtotal / savings / delivery / total + payment method & status), and a **Cancel order** button shown only while `cancellable`. `loading.tsx` + `not-found.tsx`. |

## Components
- **`OrderStatusBadge`** + `ORDER_STATUS_META` / `ORDER_FLOW` added to `@suplaykart/ui` (semantic-token colours; reused by the admin in 1J).
- **`CancelOrderButton`** (client): `window.confirm` → `cancelOrderAction` (which calls the ownership-enforced, stock-releasing `cancelOrder`).
- `formatDateTime` / `formatDate` added to `@suplaykart/ui`.
- Added **My Orders** to the `/account` menu.

## Verification
```
pnpm typecheck → 3/3   exit 0
pnpm build     → /account/orders + /account/orders/[id] ƒ dynamic, exit 0
```
The underlying `listOrders` / `getOrderById` / `cancelOrder` (incl. ownership + cancellable window + stock release) were verified end-to-end in **1G's `verify:orders` (21/21, PGlite)**; this phase is the presentation layer over them. Interactive UI screenshots require a live OTP session.
