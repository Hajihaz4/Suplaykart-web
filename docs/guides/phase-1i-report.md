# Phase 1I — Admin Foundation

**Date:** 2026-07-01 · **Scope:** role-gated `/admin` shell + read-only screens for all 8 sections. **Mutations land in 1J.**
**Result:** ✅ `/admin` (+ 8 sections) behind staff RBAC, responsive shell, dashboard KPIs. typecheck 3/3, build (9 admin routes), guest blocked.

## RBAC
- `lib/auth.ts`: `isStaff(user)` (role ≠ customer) + **`requireAdmin()`** (redirects customers home). Middleware already requires auth on `/admin(.*)`; `requireAdmin` in the admin layout is the role check on top (defense-in-depth).
- `pnpm --filter @suplaykart/db promote -- "<phone>" [role]` promotes a signed-in user to a staff role (default `owner`) so they can reach `/admin`.

## Admin read DAL (`packages/db/src/dal/admin.ts`)
`getAdminStats` (products/active, categories, orders/pending, customers, low-stock, delivered revenue) · `adminListProducts` (category + price + live stock) · `adminListCategories` (product counts) · `adminListOrders` + `adminGetOrderById` (customer + items + timeline) · `adminListCustomers` (order counts) · `adminListAddresses` · `adminListInventory` (on-hand/reserved/available + low flag) · `getStoreSettings`.

## UI
- **`AdminShell`** (client): desktop left sidebar + mobile top bar with scrollable nav, active-link highlighting (`usePathname`), role chip, "back to store". `admin-ui.tsx`: `AdminPageHeader`, `StatCard`, `DataTable`, `Td`, `Pill`.
- **Routes** (all `ƒ` dynamic): `/admin` (KPI cards + recent orders), `/admin/orders` (+ `/[id]` detail: items, timeline, customer, address, bill), `/admin/products`, `/admin/categories`, `/admin/inventory`, `/admin/customers`, `/admin/addresses`, `/admin/settings` (read-only view).

## Verification
```
pnpm typecheck → 3/3   exit 0
pnpm build     → 9 admin routes ƒ dynamic, exit 0
guest access:  /admin, /admin/*  → blocked (404) ;  /  → 200
```
Staff RBAC (`requireAdmin` redirect for customers) is enforced in the layout (build/typecheck verified; runtime needs an authenticated staff session via the `promote` script).

## Follow-ups (1J)
Product/category CRUD, inventory adjustment, order status management (reusing `updateOrderStatus`), customer block/unblock, editable store settings, and an audit-log table.
