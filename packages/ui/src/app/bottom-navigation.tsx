import * as React from "react";
import { cn } from "../lib/cn";
import type { NavItem } from "../types";

export interface BottomNavigationProps {
  items: NavItem[];
  activeKey: string;
  linkComponent?: React.ElementType;
  className?: string;
}

/** Fixed mobile/tablet tab bar (hidden on desktop, where the header navigates). */
export function BottomNavigation({
  items,
  activeKey,
  linkComponent: Link = "a",
  className,
}: BottomNavigationProps) {
  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface shadow-nav lg:hidden",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-md items-stretch px-1 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
        {items.map((item) => {
          const active = item.key === activeKey;
          const tone = item.accent ? "text-accent" : "text-brand";
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-0.5"
            >
              <span
                className={cn(
                  "transition",
                  active ? cn(tone, "scale-110") : "text-muted-light",
                )}
              >
                {item.icon}
              </span>
              <span
                className={cn(
                  "text-2xs font-semibold",
                  active ? tone : "text-muted-light",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
