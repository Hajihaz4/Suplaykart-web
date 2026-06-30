"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "@suplaykart/ui";
import { NAV_ITEMS } from "./nav-config";

export function AppBottomNav() {
  const pathname = usePathname();
  const active =
    NAV_ITEMS.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
    )?.key ?? "home";

  return (
    <BottomNavigation items={NAV_ITEMS} activeKey={active} linkComponent={Link} />
  );
}
