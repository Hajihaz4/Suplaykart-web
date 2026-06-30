import * as React from "react";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  MapPin,
  Package,
  Ticket,
} from "lucide-react";
import { Card, cn } from "@suplaykart/ui";
import { StoreShell } from "@/components/store-shell";
import { CART_LINES } from "@/lib/mock-data";

const cartCount = CART_LINES.reduce((n, l) => n + l.qty, 0);

const MENU: { icon: React.ReactNode; label: string; href: string }[] = [
  { icon: <Package className="size-[18px]" />, label: "Your Orders", href: "/account" },
  { icon: <MapPin className="size-[18px]" />, label: "Saved Addresses", href: "/account" },
  { icon: <Ticket className="size-[18px]" />, label: "Coupons & Offers", href: "/account" },
  { icon: <Bell className="size-[18px]" />, label: "Notifications", href: "/account" },
  { icon: <HelpCircle className="size-[18px]" />, label: "Help & Support", href: "/account" },
  { icon: <FileText className="size-[18px]" />, label: "Policies & Info", href: "/account" },
];

export default function AccountPage() {
  return (
    <StoreShell cartCount={cartCount}>
      <div className="space-y-3 p-3">
        <Card className="flex items-center gap-3 p-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-brand text-xl font-black text-white">
            G
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-extrabold text-ink">Guest</div>
            <div className="text-xs text-muted">
              Sign in to sync your orders &amp; addresses
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          {MENU.map((m, i) => (
            <Link
              key={m.label}
              href={m.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5",
                i > 0 && "border-t border-border-light",
              )}
            >
              <span className="grid size-9 place-items-center rounded-lg bg-brand-light text-brand">
                {m.icon}
              </span>
              <span className="flex-1 text-sm font-semibold text-ink">
                {m.label}
              </span>
              <ChevronRight className="size-4 text-muted-light" />
            </Link>
          ))}
        </Card>

        <p className="pt-2 text-center text-2xs text-muted">
          App version 1.0.0 · Suplaykart
        </p>
      </div>
    </StoreShell>
  );
}
