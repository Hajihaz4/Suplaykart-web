# Page Inventory — Legacy `old-html/`

**Audit date:** 2026-06-30 · **Source:** `old-html/*.html` (16 files) · **Status:** analysis only, no migration performed.

## What these files are

Sixteen **mobile-first prototype screens** (390 px phone shell) for **Suplaykart**, a single-store hyperlocal q-commerce app for **Nagore, Tamil Nadu**. They span three product lines: **Grocery** (instant delivery), **Restaurants** (food delivery), and **Pick & Drop** (courier). Each file is a self-contained `.html` with inline `<style>` + vanilla `<script>` and **mock data**.

### Cross-cutting facts (apply to every page)

| Fact | Implication for migration |
| --- | --- |
| **Single store** ("Suplaykart Store") — no multi-supplier UI | Matches the approved **single-tenant** Phase-1 decision. |
| **Mobile only** (`max-width:390px` shell) | **No desktop/responsive layouts exist** — they must be designed during migration. |
| **Emoji + CSS gradients as imagery** (no real images) | Real product/category/restaurant imagery is **missing** and must be sourced. |
| **Consistent design tokens** (`:root` CSS vars: green `#0C831F`, orange `#FF6B00`, red `#E23744`, Poppins font) | Excellent basis for one shared **Tailwind preset + theme** (see `component-inventory.md`). |
| **Prototype "demo control" panels** (weather/zone/step togglers) on several pages | Prototype-only — **strip during migration**. |
| **All logic is client-side mock** (no API, no persistence) | 0% backend exists; every screen needs real data wiring (see `migration-plan.md`). |
| **Auth = phone + OTP** (WhatsApp/SMS); **payments = COD / UPI-on-delivery** ("online — Razorpay coming soon") | Aligns with Phase-1 "checkout UI, no live payments". |

---

## Master route map (OLD FILE → NEW ROUTE)

> Phase tags reflect the approved Phase-1 scope (grocery storefront + admin; **no** payments/restaurants/pick yet).

```
suplaykart-home.html              →  /                                  [P1]
suplaykart-empty-home.html        →  /  (out-of-service state)          [P1]  *consolidates*
suplaykart-out-of-service.html    →  /coming-soon                       [P1]  *consolidates*
suplaykart-categories.html        →  /categories                        [P1]
suplaykart-products.html          →  /products  (and /c/[category])     [P1]
suplaykart-product-detail.html    →  /products/[slug]                   [P1]
suplaykart-search.html            →  /search                            [P1]
suplaykart-cart.html              →  /cart  →  /checkout                 [P1]  *merged in legacy*
suplaykart-tracking.html          →  /orders/[orderId]  (details+track) [P1]
suplaykart-profile.html           →  /account  (+ sub-routes below)     [P1]
suplaykart-login.html             →  /login                             [P1]
suplaykart-address.html           →  /account/addresses/new  &  /[id]/edit  [P1]
   ↳ /account/addresses (list view) is sourced from suplaykart-profile.html (page-addresses); address.html is the new/edit form only.
suplaykart-wishlist.html          →  /wishlist                          [P1]
suplaykart-notifications.html     →  /notifications  (feed)             [P1]
suplaykart-pick.html              →  /pick                              [P2]
suplaykart-restaurants.html       →  /restaurants  &  /restaurants/[id] [P2]
```

**Account sub-routes (all derived from `suplaykart-profile.html`'s in-page stack):**

```
/account              (hub)            /account/coupons      (coupons)
/account/orders       (order history)  /account/help        (help & support)
/account/addresses    (address book)   /account/notifications (notif settings)
/account/profile      (edit profile)   /account/policies     (terms/privacy/…)
/account/refunds      (refunds list)
```

> **Naming clash to resolve:** notifications **feed** = `/notifications`; notification **settings** = `/account/notifications`. Keep them distinct.

---

## Per-page analysis

Legend — **Complexity:** Low / Medium / High / Very-High (effort to rebuild faithfully + wire to data).

### 1. `suplaykart-home.html`
- **Page name:** Home / Storefront
- **Purpose:** Primary landing — browse categories, offers, featured products; add to cart.
- **Journey position:** Entry point after login/location (default tab).
- **Recommended route:** `/`
- **Dynamic/static:** Dynamic (catalog, banners, weather, serviceability).
- **Data requirements:** Products, categories, promo banners/carousel, "Low Prices" picks, "Buy Again" (order history), store hours/holiday status, weather state, serviceable-area check.
- **Reusable components:** AppHeader (location + weather), SearchBar, CategoryPill row, HeroCarousel, ProductCard, CategoryCard, AdBanner, SectionHeader, Footer, BottomNav, OutOfService screen (embedded).
- **Forms:** Search input only.
- **Business logic:** Add-to-cart + badge; weather theming (normal/rain/summer); **service-zone gating** (in-zone app vs out-of-zone screen); carousel autoplay; sticky-search-on-scroll.
- **Dependencies:** Poppins font, inline SVG, emoji imagery, CSS-var tokens.
- **Migration complexity:** **High** (most components originate here).

### 2. `suplaykart-empty-home.html` (title: "Out of Service Area")
- **Page name:** Out-of-service / serviceability gate (pincode variant)
- **Purpose:** Shown when user's location is outside the delivery zone; check pincode + join waitlist.
- **Journey position:** Conditional gate before/instead of Home.
- **Recommended route:** `/` (out-of-service state) — *consolidate with #1 and #16.*
- **Dynamic/static:** Dynamic (serviceable pincodes, cities, waitlist).
- **Data requirements:** Serviceable pincodes/cities, waitlist signups.
- **Reusable components:** AppHeader (location), ServiceMap (SVG), PincodeChecker, NotifyCard + NotifySheet, CityRow list, WhatsAppCTA.
- **Forms:** Pincode check; notify-me (city / pincode / WhatsApp number / interest pills).
- **Business logic:** Pincode serviceability lookup; notify-me submit; loader states.
- **Dependencies:** As above.
- **Migration complexity:** **Medium** (overlaps heavily with #16).

### 3. `suplaykart-out-of-service.html` (title: "Coming Soon")
- **Page name:** Coming-soon / waitlist (city variant)
- **Purpose:** City-level "we don't deliver here yet" + waitlist progress + invite friends.
- **Journey position:** Conditional gate (alternate of #2).
- **Recommended route:** `/coming-soon` — *consolidate with #2.*
- **Dynamic/static:** Dynamic (locations, waitlist counts/positions).
- **Data requirements:** City list (live/coming-soon), per-city waitlist counts, invite/referral.
- **Reusable components:** AppHeader, ServiceMap, WaitlistCard (progress bar), NotifyForm, CityRow, InviteCard, BrowseCard, HelpCard, Footer brand.
- **Forms:** Notify (phone); invite/share.
- **Business logic:** Location switch; waitlist submit + count increment; invite/share.
- **Dependencies:** As above.
- **Migration complexity:** **Medium**. *#2 + #3 + Home's OOS screen are three designs of one concept — unify into a single serviceability component with variants.*

### 4. `suplaykart-categories.html`
- **Page name:** Categories
- **Purpose:** Browse the full category tree; drill into subcategories.
- **Journey position:** "Category" bottom-nav tab.
- **Recommended route:** `/categories`
- **Dynamic/static:** Dynamic (category tree rendered from data).
- **Data requirements:** Category tree (sections → categories → subcategories), spotlight stores.
- **Reusable components:** AppHeader (title + cart + profile), SearchBar, CategorySidebar (scroll-spy), CategoryTile, SubcategoryOverlay (slide-in), SpotlightCard, BottomNav.
- **Forms:** Search/filter input.
- **Business logic:** IntersectionObserver scroll-spy (active section), jump-to-section, subcategory overlay, client-side search filter.
- **Dependencies:** As above.
- **Migration complexity:** **Medium-High** (scroll-spy interaction).

### 5. `suplaykart-products.html`
- **Page name:** Product Listing (category)
- **Purpose:** Filterable/sortable product grid for a category (sample: "Chips & Namkeen", 24 items).
- **Journey position:** From category/home → listing → PDP.
- **Recommended route:** `/products` (general) and `/c/[category]` (per-category).
- **Dynamic/static:** Dynamic (filter/sort/search over product set).
- **Data requirements:** Products (name, brand, weight, price, MRP, %off, rating, reviews, veg flag, badges, variant-option count).
- **Reusable components:** TopBar (back+title+cart), SearchBar, FilterBar/FilterPill, ProductCard, SortSheet (BottomSheet), EmptyState, See-all strip, BottomNav.
- **Forms:** Search; filter/sort controls.
- **Business logic:** Filter (veg/offer/brand), sort (price/rating/discount), search, wishlist toggle, add-to-cart, "+N options" handling.
- **Dependencies:** As above.
- **Migration complexity:** **Medium-High**.

### 6. `suplaykart-product-detail.html`
- **Page name:** Product Detail (PDP)
- **Purpose:** Full product view with variants, gallery, details, similar products.
- **Journey position:** Listing/search/home → PDP → cart.
- **Recommended route:** `/products/[slug]`
- **Dynamic/static:** Dynamic (product + variants + nutrition + similar).
- **Data requirements:** Product (images, brand, rating, highlights, variant units+prices, key info, nutrition, similar products, "bought earlier" flag).
- **Reusable components:** TopIcons (back/wishlist/search/share), ImageGallery (+ fullscreen viewer), VariantSelector, BrandRow, TrustBadge, SimilarProducts grid (ProductCard), StickyAddBar (price + qty stepper), DetailsSheet (accordions).
- **Forms:** None (selectors only).
- **Business logic:** Horizontal product **pager** (swipe between products), gallery dots/zoom, variant selection → price update, qty/cart, wishlist, details bottom-sheet with accordions.
- **Dependencies:** As above.
- **Migration complexity:** **High** (rich interactions: pager + gallery + sheet).

### 7. `suplaykart-search.html`
- **Page name:** Search
- **Purpose:** Search with live suggestions, recent searches, faceted filtering of results.
- **Journey position:** Search entry from any header.
- **Recommended route:** `/search`
- **Dynamic/static:** Dynamic (suggestions + results + facets).
- **Data requirements:** Product index, autocomplete suggestions, recent searches, facet values (qty/price/brand/rating).
- **Reusable components:** SearchBar (mic/clear), SuggestionList, RecentSearches, FilterBar, FilterSheet (sort/qty/price/brand/rating/all), ProductCard, EmptyState, BottomNav.
- **Forms:** Search input; price-range inputs; multi-select facets.
- **Business logic:** Suggestion matching/highlighting, recent-search store, multi-facet filter + sort, price-range, wishlist/cart.
- **Dependencies:** As above.
- **Migration complexity:** **High** (faceted search UX; real search backend needed).

### 8. `suplaykart-cart.html` (title: "Checkout")
- **Page name:** Cart + Checkout (merged)
- **Purpose:** Review cart, apply coupon, compute bill, choose delivery options + payment, place order.
- **Journey position:** Cart → checkout → order placed.
- **Recommended route:** `/cart` → `/checkout` *(legacy merges both; see migration-plan for split recommendation).*
- **Dynamic/static:** Dynamic (cart, dynamic pricing, coupons, address, payment).
- **Data requirements:** Cart items, pricing rules (delivery/handling/**surge**/**rain** fees, free-delivery threshold), coupons, selected address, payment methods, store open/holiday status, tip/donation config.
- **Reusable components:** DeliveryCard, ClosedBanner, CartItem (+ qty stepper), FreeDeliveryProgress, CouponCard, BillSummary, DeliveryInstructions chips, TipCard, DonateCard, OptionCard (gift/GSTIN/someone-else), AddressStrip, PaymentMethodSheet, CouponSheet, OrderSuccessModal.
- **Forms:** Coupon code, donation amount, qty steppers, (gift/GSTIN/receiver inputs).
- **Business logic:** **Heaviest on the customer side** — full bill computation (subtotal, fees, surge/rain surcharges, coupon discount, tip, donation, GST-included, free-delivery threshold), payment selection (COD / UPI-on-delivery / online "coming soon"), place-order → success.
- **Dependencies:** As above.
- **Migration complexity:** **Very High** (pricing engine + order creation — design schema first).

### 9. `suplaykart-tracking.html`
- **Page name:** Order Tracking / Order Details
- **Purpose:** Live order status, rider info, timeline, items, bill, post-delivery rating.
- **Journey position:** After order placed; from orders list/notifications.
- **Recommended route:** `/orders/[orderId]`
- **Dynamic/static:** Dynamic (order state, rider, ETA).
- **Data requirements:** Order (status state machine, items, bill breakdown, rider+vehicle, delivery address, status timeline w/ timestamps, cancel window).
- **Reusable components:** StatusHero, OrderProgressBar, LiveMap, RiderCard (call/chat), Timeline, AddressCard, OrderItemsCard (expandable), BillCard (expandable), RateCard (stars), ActionButton list.
- **Forms:** Star rating.
- **Business logic:** Status state machine (placed→confirmed→packed→OFD→delivered / cancelled), ETA + progress, **5-min cancel timer**, rating submit.
- **Dependencies:** As above.
- **Migration complexity:** **High** (real-time status; serves as order-details too).

### 10. `suplaykart-profile.html`
- **Page name:** Account hub (+ 8 in-page sub-screens)
- **Purpose:** Account home + Orders, Refunds, Addresses, Edit Profile, Coupons, Help, Notification settings, Policies.
- **Journey position:** "Account" entry; deep-linkable sub-routes.
- **Recommended route:** `/account` (+ `/account/{orders,refunds,addresses,profile,coupons,help,notifications,policies}`).
- **Dynamic/static:** Dynamic (user, orders, addresses, coupons, prefs).
- **Data requirements:** User profile, order history, saved addresses, coupons (active/used), notification preferences, refunds, store status.
- **Reusable components:** ProfileCard, QuickActionGrid, MenuList/MenuItem, Toggle, OrderCard, AddressRow, CouponCard, FormInput, HelpCTA, DangerZone (delete account), EmptyState.
- **Forms:** Profile edit (name/email), coupon apply, notification toggles.
- **Business logic:** In-page page-stack navigation (→ real routes), toggle prefs, logout, delete-account.
- **Dependencies:** As above.
- **Migration complexity:** **High** (bundles ~8 routable screens; split during migration).

### 11. `suplaykart-login.html`
- **Page name:** Login / Onboarding
- **Purpose:** Phone-number auth via OTP, then location selection.
- **Journey position:** First-run / unauthenticated gate.
- **Recommended route:** `/login`
- **Dynamic/static:** Dynamic (OTP, serviceability).
- **Data requirements:** Phone, OTP, location/serviceability.
- **Reusable components:** ProductMarquee, BrandLogo, PhoneInput (+country), OTPInput (6-box), LocationPicker (map + use-current/search).
- **Forms:** Phone entry; 6-digit OTP; location choice.
- **Business logic:** Send OTP (WhatsApp/SMS), verify OTP, resend timer (0:30), auto-read hint, finish → location.
- **Dependencies:** As above.
- **Migration complexity:** **High** (auth provider integration; OTP flow).

### 12. `suplaykart-address.html`
- **Page name:** Add / Edit Address
- **Purpose:** Pick location on map, fill address details, save with label.
- **Journey position:** From checkout / address book.
- **Recommended route:** `/account/addresses/new` and `/account/addresses/[id]/edit`.
- **Dynamic/static:** Dynamic (map, serviceability).
- **Data requirements:** Address fields, geocoded pin, serviceable-area boundary, receiver, default flag.
- **Reusable components:** MapPicker (drag-to-pan + GPS + quick chips), AddressForm, TagSelector (Home/Work/Other), Toggle, SuccessModal, DetectedAddressCard.
- **Forms:** Address form (house/floor/area/landmark, save-as, receiver name/phone, default toggle) with validation.
- **Business logic:** Map pan → reverse-geocoded address (mock), **out-of-service detection**, required-field validation, add vs edit modes, save → success.
- **Dependencies:** As above (real map provider needed).
- **Migration complexity:** **High** (real maps/geocoding replace the SVG mock).

### 13. `suplaykart-wishlist.html`
- **Page name:** Wishlist
- **Purpose:** Saved products; add to cart; remove.
- **Journey position:** From product cards/header.
- **Recommended route:** `/wishlist`
- **Dynamic/static:** Dynamic (wishlist + cart).
- **Data requirements:** Wishlist items, cart, free-delivery threshold.
- **Reusable components:** WishlistHero, ProductCard (wishlist variant), EmptyState, FreeDeliveryProgress, CartFAB, scroll-aware sticky header.
- **Forms:** None.
- **Business logic:** Add-to-cart → qty stepper, remove-from-wishlist (animated), cart FAB, empty state.
- **Dependencies:** As above.
- **Migration complexity:** **Medium**.

### 14. `suplaykart-notifications.html`
- **Page name:** Notifications feed
- **Purpose:** Categorized notification inbox with inline actions.
- **Journey position:** Bell icon from headers.
- **Recommended route:** `/notifications`
- **Dynamic/static:** Dynamic (notifications).
- **Data requirements:** Notifications (type, title, message, time, read state, attached order/coupon previews).
- **Reusable components:** Header (unread + mark-all-read), NotificationTabs, NotificationCard (order/delivery/offer/store/account/weather/refund variants), CouponInline, OrderPreview, EmptyState, SettingsHint.
- **Forms:** None.
- **Business logic:** Filter by category, mark-read / mark-all-read, swipe-to-delete, section grouping (Today/Yesterday/Earlier).
- **Dependencies:** As above (push/WhatsApp delivery backend).
- **Migration complexity:** **Medium-High**.

### 15. `suplaykart-pick.html` — *Phase 2*
- **Page name:** Pick & Drop (courier)
- **Purpose:** Book a rider to pick up/drop an item within Nagore.
- **Journey position:** "Pick" bottom-nav tab.
- **Recommended route:** `/pick`
- **Dynamic/static:** Dynamic.
- **Data requirements:** Pickup/drop addresses, item description+photo, receiver, cash-collect amount, distance/ETA, pricing.
- **Reusable components:** Header, QuickSuggestChips, LocationCard (pickup/drop) + SwapButton, AddressPickerSheet, PhotoUpload, ReceiverForm, Toggle, CollapseSection, BillSummary, StickyFooter, SuccessModal.
- **Forms:** Item desc, receiver name/phone, cash amount, special instructions.
- **Business logic:** Step-completion validation, swap pickup/drop, cash-collect toggle, distance/ETA, booking → success.
- **Dependencies:** As above.
- **Migration complexity:** **High** — **out of Phase-1 e-commerce scope** (separate logistics module).

### 16. `suplaykart-restaurants.html` — *Phase 2*
- **Page name:** Restaurants (listing + menu)
- **Purpose:** Food-delivery: browse restaurants, view menu, customize items, add to cart.
- **Journey position:** "Restaurants" bottom-nav tab.
- **Recommended route:** `/restaurants` and `/restaurants/[id]`
- **Dynamic/static:** Dynamic.
- **Data requirements:** Restaurants (rating, ETA, cuisines, offers), menus (sections, items, veg/non-veg, bestsellers, customizations), gold membership.
- **Reusable components:** RestaurantHero (+veg toggle), PromoBanner, GoldBanner, CuisineCircle, FilterChip, RestaurantCard, MenuSection (collapsible), MenuItem, CustomizationSheet, StickyCart, BottomNavTabs (pill variant), MenuNavSheet.
- **Forms:** Item customization selects; search.
- **Business logic:** Veg filter, menu section nav, item customization (radio/checkbox groups), running cart, bestseller/most-ordered tags.
- **Dependencies:** As above.
- **Migration complexity:** **Very High** — **out of Phase-1 e-commerce scope** (separate restaurant/menu domain).

---

## Coverage summary

| Bucket | Pages | Phase |
| --- | --- | --- |
| Core grocery storefront | home, categories, products, product-detail, search | **P1** |
| Cart / checkout / orders | cart(checkout), tracking(order details) | **P1** |
| Account & auth | profile (+8 sub), login, address, wishlist, notifications | **P1** |
| Serviceability states | empty-home, out-of-service (+ home OOS) | **P1** |
| Restaurants module | restaurants | **P2** |
| Pick & Drop module | pick | **P2** |

See **`component-inventory.md`** for shared-component extraction, **`missing-pages.md`** for gaps, and **`migration-plan.md`** for completion %, build order, and the phased plan.
