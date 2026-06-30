import * as React from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { AppHeader, AppShell, CartButton } from "@suplaykart/ui";
import { AppBottomNav } from "./app-bottom-nav";
import { DesktopNav } from "./desktop-nav";

export interface StoreShellProps {
  children: React.ReactNode;
  cartCount?: number;
  location?: { label: string; address: string };
}

const DEFAULT_LOCATION = {
  label: "Nagore",
  address: "Main Road, Nagore, Nagapattinam — 611002",
};

/** Storefront chrome: header + content + bottom nav (mock-data driven). */
export function StoreShell({
  children,
  cartCount = 0,
  location = DEFAULT_LOCATION,
}: StoreShellProps) {
  return (
    <AppShell
      header={
        <AppHeader
          location={location}
          locationHref="/account"
          linkComponent={Link}
          desktopNav={<DesktopNav />}
          actions={
            <>
              <CartButton count={cartCount} href="/cart" linkComponent={Link} />
              <Link
                href="/account"
                aria-label="Account"
                className="grid size-9 place-items-center rounded-full bg-surface-alt text-ink"
              >
                <User className="size-5" />
              </Link>
            </>
          }
        />
      }
      bottomNav={<AppBottomNav />}
    >
      {children}
    </AppShell>
  );
}
