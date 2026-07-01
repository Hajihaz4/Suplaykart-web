import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import {
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  MapPin,
  Ticket,
  User as UserIcon,
} from "lucide-react";
import { Card, cn } from "@suplaykart/ui";
import { db, listAddresses } from "@suplaykart/db";
import { StoreShell } from "@/components/store-shell";
import { requireCurrentUser } from "@/lib/auth";
import { currentCart } from "@/lib/cart";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireCurrentUser();
  const [addresses, { count: cartCount }] = await Promise.all([
    listAddresses(db, user.id),
    currentCart(),
  ]);

  const initial = (
    user.name?.trim()?.[0] ??
    user.phone.replace(/\D/g, "").slice(-1) ??
    "U"
  ).toUpperCase();

  const menu = [
    {
      icon: <MapPin className="size-[18px]" />,
      label: "Saved Addresses",
      href: "/account/addresses",
      badge: addresses.length ? String(addresses.length) : undefined,
    },
    { icon: <UserIcon className="size-[18px]" />, label: "Profile", href: "/account/profile" },
    { icon: <Ticket className="size-[18px]" />, label: "Coupons & Offers", href: "/account" },
    { icon: <HelpCircle className="size-[18px]" />, label: "Help & Support", href: "/account" },
    { icon: <FileText className="size-[18px]" />, label: "Policies & Info", href: "/account" },
  ];

  return (
    <StoreShell cartCount={cartCount}>
      <div className="space-y-3 p-3">
        <Card className="flex items-center gap-3 p-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-brand text-xl font-black text-white">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-extrabold text-ink">
              {user.name?.trim() || "Add your name"}
            </div>
            <div className="text-xs text-muted">{user.phone}</div>
          </div>
          <Link
            href="/account/profile"
            className="rounded-full bg-surface-alt px-3 py-1.5 text-xs font-bold text-ink"
          >
            Edit
          </Link>
        </Card>

        <Card className="overflow-hidden p-0">
          {menu.map((m, i) => (
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
              {m.badge ? (
                <span className="rounded-full bg-brand-light px-2 py-0.5 text-2xs font-bold text-brand">
                  {m.badge}
                </span>
              ) : null}
              <ChevronRight className="size-4 text-muted-light" />
            </Link>
          ))}
        </Card>

        <SignOutButton>
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/40 bg-surface px-4 py-3 text-sm font-bold text-danger">
            <LogOut className="size-4" />
            Log out
          </button>
        </SignOutButton>

        <p className="pt-1 text-center text-2xs text-muted">
          App version 1.0.0 · Suplaykart
        </p>
      </div>
    </StoreShell>
  );
}
