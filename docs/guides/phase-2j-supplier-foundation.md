# Phase 2J — Vendor/Supplier Foundation

The approved architecture is **single-tenant with a default supplier + a
multi-supplier seam** (supplier onboarding intentionally deferred). Phase 2J
lays the backend foundation so multi-supplier is an additive, non-destructive
change — without building a redundant second admin UI for the single store.

## What's in place
- **Supplier-scoped data access** — every catalog/inventory/order/serviceability
  DAL function already takes `supplierId` and scopes by it. The existing
  **admin panel is the supplier operations layer** for the default supplier
  (product/category CRUD, inventory adjustment, order management, reporting).
- **Permission seam** — new `supplier_users` table maps staff users → a supplier
  with a role (migration 0005). In single-tenant mode every staff user maps to
  the one default supplier.
- **Supplier DAL** (`dal/suppliers.ts`):
  - `listSuppliers` / `getSupplier`
  - `assignSupplierUser` / `removeSupplierUser` / `listSupplierUsers`
  - `getUserSupplierIds` / `isSupplierMember` — the supplier-scoped access check
  - `getSupplierReport` — scoped revenue, order status breakdown, product count,
    and top products (feeds analytics in 2K).

## The additive path to multi-supplier (future)
1. Seed additional `suppliers` rows + `supplier_users` memberships.
2. Gate admin routes on `getUserSupplierIds` (a member sees only their
   suppliers' data — the DAL is already scoped, so this is a filter, not a
   rewrite).
3. Add a supplier onboarding flow + a supplier-scoped dashboard that reuses the
   admin components with the member's `supplierId`.

No production data changes; the default supplier and its admin keep working
exactly as before.
