"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  FolderTree,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { cn } from "@suplaykart/ui";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/addresses", label: "Addresses", icon: MapPin },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({
  userName,
  role,
  children,
}: {
  userName: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-surface-alt md:flex">
      {/* sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2 border-b border-border-light px-5 py-4">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">
            <Store className="size-4" />
          </span>
          <span className="text-sm font-extrabold text-ink">Suplaykart</span>
          <span className="ml-auto rounded-full bg-brand-light px-2 py-0.5 text-2xs font-bold text-brand">
            {role}
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((n) => {
            const active = isActive(n.href, n.exact);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold",
                  active
                    ? "bg-brand-light text-brand"
                    : "text-muted hover:bg-surface-alt hover:text-ink",
                )}
              >
                <n.icon className="size-[18px]" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border-light p-3">
          <div className="px-3 py-1 text-2xs text-muted-light">
            Signed in as
          </div>
          <div className="px-3 text-sm font-bold text-ink">{userName}</div>
          <Link
            href="/"
            className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-surface-alt"
          >
            <Store className="size-4" /> Back to store
          </Link>
        </div>
      </aside>

      {/* mobile top nav */}
      <div className="md:hidden">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
          <span className="grid size-7 place-items-center rounded-lg bg-brand text-white">
            <Store className="size-4" />
          </span>
          <span className="text-sm font-extrabold text-ink">Admin</span>
          <span className="ml-auto rounded-full bg-brand-light px-2 py-0.5 text-2xs font-bold text-brand">
            {role}
          </span>
        </header>
        <nav className="scrollbar-none sticky top-[49px] z-20 flex gap-1.5 overflow-x-auto border-b border-border-light bg-surface px-3 py-2">
          {NAV.map((n) => {
            const active = isActive(n.href, n.exact);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold",
                  active
                    ? "bg-brand text-white"
                    : "bg-surface-alt text-muted",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
