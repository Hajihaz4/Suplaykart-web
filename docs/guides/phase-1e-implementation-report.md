# Phase 1E — Implementation Report (User System + Address Management)

**Date:** 2026-07-01 · **Scope:** user profile + address management on the existing Clerk + Neon + Drizzle stack. **No checkout, orders, inventory, admin, or payments.**
**Result:** ✅ user sync + profile + full address CRUD (Server Actions) with ownership enforcement; typecheck + build green; DAL lifecycle verified 14/14; authorization verified.

---

## 1. User sync (Step 1)
- The Clerk webhook (`/api/webhooks/clerk`) already handles `user.created` / `user.updated` → `upsertUserFromClerk`. **Verified, unchanged.**
- Added **`apps/web/src/lib/auth.ts`**:
  - `getCurrentUser()` — Clerk session → local `users` row, **lazily upserting** if the webhook hasn't created it (robust on localhost where webhooks can't reach).
  - `requireCurrentUser()` — same, but redirects home if unauthenticated.

## 2. DAL functions added (Step 2)
`packages/db/src/dal/users.ts`
- `getUserById(db, id)` · `updateProfile(db, userId, {name,email})` (plus existing `getUserByClerkId`, `upsertUserFromClerk`). Type `User`.

`packages/db/src/dal/addresses.ts` (new) — all **DI, ownership-enforced (`userId` in every `WHERE`), typed, transactional**:
- `listAddresses(db, userId)` (default first) · `getAddressById(db, userId, id)` · `createAddress` · `updateAddress` · `deleteAddress` (soft, promotes next default) · `setDefaultAddress`. Type `Address`, input `AddressInput`.
- Default management is atomic (`db.transaction`): first address auto-default; promoting one unsets others and updates `users.default_address_id`; deleting the default promotes the newest remaining.

## 3. Routes created (Step 3–5)
| Route | Purpose |
| --- | --- |
| `/account` | Profile card (name, phone, address count) + menu + **Clerk sign-out** |
| `/account/profile` | Name + email update (`ProfileForm` → Server Action + Zod) |
| `/account/addresses` | Address list (`AddressCard`) + add / edit / delete / set-default |
| `/account/addresses/new` | Create address (`AddressForm`) |
| `/account/addresses/[id]` | Edit address (ownership-checked; `notFound()` on miss) |

All are `ƒ` dynamic (auth). Error handling (Step 8): `account/loading.tsx`, `account/addresses/[id]/not-found.tsx`, plus the root `error.tsx` / `not-found.tsx` (DB failures, missing address, unknown routes). Unauthorized access is handled by middleware (redirect to sign-in).

## 4. Server Actions created (Step 4–5)
`account/profile/actions.ts` — `updateProfileAction` (Zod: name ≤80, optional email).
`account/addresses/actions.ts` — `createAddressAction`, `updateAddressAction` (bound to id), `deleteAddressAction`, `setDefaultAddressAction`. Zod-validated (label enum, 6-digit pincode, optional 10-digit recipient phone), each calls `requireCurrentUser()` then the ownership-enforced DAL, and `revalidatePath` / `redirect`.

## 5. UI components (Step 7)
Added to `@suplaykart/ui` (reusing tokens + primitives; no new styling system): **`AddressCard`** (label + default badge + actions slot), **`AddressForm`** (label tiles Home/Work/Other + custom label, recipient toggle, default checkbox; `useActionState`), **`ProfileForm`** (name/email, read-only phone).

## 6. Verification results (Step 9)
```
pnpm typecheck            → Turbo 3/3                              exit 0
pnpm build                → all 5 account routes ƒ dynamic         exit 0
verify:addresses (PGlite) → 14/14 assertions                      exit 0
  create→default · list order · setDefault · update · UPDATE users.default_address_id
  ownership: B cannot read/update/delete A's address
  delete default → promote newest → users.default_address_id updated
authorization (dev, guest):
  /  /categories                          → 200
  /account /account/* /cart /checkout /orders → blocked
    (browser → redirect to Clerk sign-in; non-browser → 404)
```
The DAL test proves the interactive checklist (create / edit / delete / set-default / **data persists** / ownership) at the data layer against a real Postgres engine. The live Neon DB was migrated + seeded in Phase 1D and `getCurrentUser` lazily syncs the signed-in user.

## 7. Screenshots summary
- **Sign-in gate** (mobile + desktop): guests hitting `/account` are redirected to the Clerk hosted sign-in showing **Phone number (IN +91)** — confirming both the authorization gate and the phone-OTP method.
- Authenticated account/address UI is behind the OTP gate; it is verified by the build (routes compile), typecheck, and the address-DAL lifecycle test. Full interactive UI screenshots require a live SMS-OTP session, which can't be automated headlessly here.

## 8. Remaining work for Phase 1F
- Build an **in-app** phone-OTP sign-in/sign-up UI (currently Clerk hosted portal) + onboarding (name + location).
- **Address map picker** (geocoding, serviceability check) per the legacy `address.html`.
- **Server cart** tied to the user (still no checkout), then the checkout UI (COD).
- **Orders list** on `/account/orders`; notifications feed/settings.
- Wire the default address into the storefront header (replace the hard-coded location chip).
- Clerk **testing tokens** for automated authed E2E screenshots.
