# Component Inventory — Legacy `old-html/`

**Audit date:** 2026-06-30 · **Status:** analysis only. Purpose: identify reusable UI patterns across the 16 prototype screens so the rebuild ships **one shared component library** (`packages/ui`) instead of re-implementing per page.

## How to read this

The legacy files duplicate the same markup/CSS on every page (each is standalone). The same visual element — a product card, a bottom sheet, the bottom nav — is re-coded 3–8 times with minor variations. Consolidating these is the single biggest efficiency win of the migration.

- **Pages** = how many of the 16 screens contain the pattern.
- **Reuse** = High (≥5 pages), Medium (3–4), Low (1–2 but still worth a component).
- All share the same **design tokens** (`:root` CSS variables), so a single Tailwind preset + theme should be extracted first.

---

## A. Shared design foundation (extract first)

| Token group | Values seen | Target |
| --- | --- | --- |
| Brand colors | green `#0C831F` / dk `#085316` / lt `#E8F5E9`; orange `#FF6B00`; red `#E23744`; blue `#1565C0`; purple `#8E24AA` | Tailwind theme colors |
| Neutrals | dark `#1C1C1C`, gray `#6B6B6B`, light `#F5F5F5`, border `#E8E8E8` | Tailwind grays |
| Typography | **Poppins** 400–900 (Google Fonts) | `next/font` + Tailwind font scale |
| Radii / shadows | 8–18 px radii, soft shadows, phone-shell `box-shadow` | Tailwind radius/shadow tokens |
| Motion | shared keyframes (`slideDown`, `shimmer`, `spin`, `pulse`, toast) | shared animation utilities |

---

## B. Core reusable components (ranked by reuse)

| # | Component | Appears in (pages) | Pages | Reuse | Variants / notes |
| --- | --- | --- | --- | --- | --- |
| 1 | **Toast** | every screen | 16 | High | Identical on all — make a `useToast()` + `<Toaster>` once. |
| 2 | **AppHeader** | nearly every screen, under different class names: `.hdr` in 10 (home, profile, tracking, notifications, address, pick, cart, empty-home, out-of-service, wishlist); `.topbar` (categories, products); hero header (restaurants); `.search-row` (search); `.top-icons` (product-detail) | ~16 | High | Header recurs everywhere under different class names → unify into **one** flexible AppHeader (location / title+back / search variants). |
| 3 | **BottomSheet** (modal sheet) | cart, search, products, product-detail, pick, restaurants, address, empty-home, profile | ~9 | High | Generic drag-handle sheet; everything else (sort, coupon, payment, address-picker, customization, notify) is content inside it. |
| 4 | **BottomNav** (5-tab) | home, categories, products, search (shared `.bnav`); restaurants uses a distinct pill `.bot-nav` variant | 4 (+1 variant) | High | Tabs: Home/Shop/Category/Pick/Restaurants. Wishlist has a floating cart bar, **not** a nav. One component, active per route. |
| 5 | **ProductCard** | products & search share `.pcard` (2 identical); the **same pattern** is re-coded distinctly as `.prod-card`/`.hcard`/`.lp-box` (home), `.sim-card` (PDP similar), `.card` (wishlist), `.rcard` (restaurants) | 2 identical + ~4 variant impls | High | **6 separate implementations of one pattern** — the strongest consolidation target. Sub-parts: VegDot, Badge, WishHeart, AddButton. |
| 6 | **SearchBar** | home, categories, products (`.srch-bar`), search (`.s-input-wrap`), restaurants (`.search-bar`) | 5 | High | Variants: static "tap to search" vs active input w/ mic + clear. (Wishlist has only a header search icon, not a bar.) |
| 7 | **AddButton / QtyStepper** | home, products, product-detail, cart, wishlist, restaurants | ~6 | High | ADD ↔ −/qty/+ stepper; "+N options" state. |
| 8 | **Veg/Non-veg mark** | products, product-detail, search, cart, restaurants | ~5 | High | veg (green) / non-veg (brown) / egg (amber). |
| 9 | **EmptyState** | products, search, wishlist, notifications, profile(refunds) | ~5 | High | art + title + subtitle + optional CTA. |
| 10 | **BillSummary** | cart, tracking | 2 | Medium | Rows + discounts + total + savings strip. (Pick has its own simpler price card, not this.) |
| 11 | **CouponCard / CouponInline** | cart, profile, notifications | 3 | Medium | Dashed-border coupon w/ code + apply/use/copy. |
| 12 | **AddressCard / AddressRow / AddressStrip** | profile, tracking, address, cart, pick | ~5 | High | Label (Home/Work/Other) + line + actions. |
| 13 | **Toggle / Switch** | address, profile, pick, cart | 4 | Medium | iOS-style toggle. |
| 14 | **Modal (centered) / SuccessModal** | address, pick, cart | 3 | Medium | Success check + id + CTAs. |
| 15 | **CategoryCard / CategoryTile** | home, categories | 2 | Medium | Colored tile + emoji + name. |
| 16 | **HeroCarousel** | home | 1 | Low | Auto-advancing slides + dots (reusable for banners). |
| 17 | **AdBanner / PromoBanner** | home, restaurants | 2 | Medium | Gradient banner + CTA. |
| 18 | **FilterBar + FilterPill + FilterSheet** | products, search, restaurants | 3 | Medium | Pills + facet sheets (sort/qty/price/brand/rating). |
| 19 | **RatingStars** | products, product-detail, search, tracking, wishlist | ~5 | High | Display + interactive (rate order). |
| 20 | **Footer** | home, out-of-service | 2 | Low | Brand, store hours, WhatsApp, socials, copyright. |
| 21 | **FreeDeliveryProgress** | cart, wishlist | 2 | Medium | Threshold progress bar. |
| 22 | **MapView (SVG → real map)** | address, login, tracking, empty-home, out-of-service | ~5 | High | Mock SVG today; one real `<MapView>` abstraction later. |
| 23 | **Timeline / StatusStepper** | tracking | 1 | Low | Order journey steps. |
| 24 | **NotificationCard** | notifications | 1 (7 variants) | Low | Type-driven (order/offer/store/account/…). |
| 25 | **ProfileMenu / MenuList + MenuItem** | profile | 1 (many rows) | Low | Icon + title + sub + arrow; reused across account. |
| 26 | **OrderCard** | profile(orders), tracking, help | 3 | Medium | Status + price + item thumbs + actions. |
| 27 | **RiderCard** | tracking | 1 | Low | Avatar + rating + call/chat. |
| 28 | **CuisineCircle / RestaurantCard / MenuItem / CustomizationSheet** | restaurants | 1 | Low | **P2** restaurant-domain components. |
| 29 | **LocationCard + SwapButton / PhotoUpload / QuickSuggestChips** | pick | 1 | Low | **P2** pick-drop components. |
| 30 | **PincodeChecker / WaitlistCard / NotifyForm / CityRow** | empty-home, out-of-service | 2 | Medium | Serviceability components. |
| 31 | **OTPInput / PhoneInput** | login | 1 | Low | Auth inputs (also reusable in address receiver). |
| 32 | **CollapseSection / Accordion** | product-detail, pick, tracking, cart | 4 | Medium | Expandable section primitive. |

---

## C. Duplicated UI patterns (the consolidation opportunity)

| Pattern | Re-implemented in | Single component replaces |
| --- | --- | --- |
| Bottom sheet shell (handle + backdrop + slide-up) | 9 screens, ~12 instances | **1** `BottomSheet` primitive |
| Bottom navigation bar | 4 screens (+ restaurants pill variant) | **1** `BottomNav` |
| Product card | 6 distinct implementations (`pcard`/`prod-card`/`hcard`/`sim-card`/`card`/`rcard`) | **1** `ProductCard` (+variants) |
| Search bar | 5 screens | **1** `SearchBar` |
| Toast | 16 screens | **1** `useToast` |
| ADD → qty stepper | 6 screens | **1** `AddToCartControl` |
| Header (location/title/back) | ~all screens (multiple class names: `.hdr`/`.topbar`/hero/`.search-row`/`.top-icons`) | **1** `AppHeader` (+variants) |
| Veg/non-veg mark | 5 screens | **1** `DietMark` |
| Empty state | 5 screens | **1** `EmptyState` |
| Address card/row/strip | 5 screens | **1** `AddressBlock` (+variants) |
| Map (mock SVG) | 5 screens | **1** `MapView` abstraction |
| Bill summary rows | 3 screens | **1** `BillSummary` |

---

## D. Estimated shared component count

| Layer | Components | Notes |
| --- | --- | --- |
| **Primitives** (UI kit) | ~14 | Button, AddToCartControl, BottomSheet, Modal, Toast, Toggle, DietMark, RatingStars, Badge, FormInput, EmptyState, Accordion, Avatar, Chip/Pill. |
| **Composite** (shared across pages) | ~12 | AppHeader, BottomNav, SearchBar, ProductCard, CategoryCard, AddressBlock, CouponCard, BillSummary, FilterBar+FilterSheet, HeroCarousel/Banner, FreeDeliveryProgress, MapView. |
| **Feature** (page-specific, still componentized) | ~14 | Timeline, RiderCard, OrderCard, NotificationCard, ProfileMenu, OTPInput/PhoneInput, PincodeChecker, WaitlistCard, VariantSelector, ImageGallery, CartItem, DeliveryInstructions, TipCard/DonateCard, CustomizationSheet (P2), Pick LocationCard (P2). |

**Total: ~40 React components**, of which **~26 are Phase-1** (excluding restaurant/pick feature components). The **~14 primitives + ~12 composites reused across 5–9 screens each** are where consolidation pays off most — build these first (see `migration-plan.md`, Pass 2).

> **Recommendation:** stand up `packages/ui` with the 14 primitives + the shared Tailwind theme **before** building any page, so every screen composes from the same parts and the legacy look is reproduced once, centrally.
