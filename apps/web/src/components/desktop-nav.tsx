"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@suplaykart/ui";
import { NAV_ITEMS } from "./nav-config";

/** Inline top-nav shown on desktop (lg+). */
export function DesktopNav() {
  const pathname = usePathname();
  return (
    <>
      {NAV_ITEMS.filter((i) => i.key !== "cart" && i.key !== "account").map(
        (item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-bold transition",
                active ? "bg-brand-light text-brand" : "text-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        },
      )}
    </>
  );
}
