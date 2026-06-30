import { Home, LayoutGrid, Search, ShoppingCart, User } from "lucide-react";
import type { NavItem } from "@suplaykart/ui";

/** Bottom-nav + desktop-nav items (shared). */
export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Home", href: "/", icon: <Home className="size-[22px]" /> },
  {
    key: "categories",
    label: "Categories",
    href: "/categories",
    icon: <LayoutGrid className="size-[22px]" />,
  },
  {
    key: "search",
    label: "Search",
    href: "/search",
    icon: <Search className="size-[22px]" />,
  },
  {
    key: "cart",
    label: "Cart",
    href: "/cart",
    icon: <ShoppingCart className="size-[22px]" />,
  },
  {
    key: "account",
    label: "Account",
    href: "/account",
    icon: <User className="size-[22px]" />,
  },
];
