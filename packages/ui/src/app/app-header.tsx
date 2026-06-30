import * as React from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { cn } from "../lib/cn";

export interface AppHeaderProps {
  location?: { label: string; address: string };
  locationHref?: string;
  linkComponent?: React.ElementType;
  actions?: React.ReactNode;
  /** Desktop-only inline nav (hidden below lg). */
  desktopNav?: React.ReactNode;
  className?: string;
}

export function AppHeader({
  location,
  locationHref,
  linkComponent: Link = "a",
  actions,
  desktopNav,
  className,
}: AppHeaderProps) {
  const Loc: React.ElementType = locationHref ? Link : "div";
  const locProps = locationHref ? { href: locationHref } : {};

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border-light bg-surface",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-base font-black text-white">
          S
        </div>

        {location ? (
          <Loc {...locProps} className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm font-extrabold text-ink">
              <MapPin className="size-3.5 text-accent" />
              <span className="truncate">{location.label}</span>
              <ChevronDown className="size-3 text-muted" />
            </div>
            <div className="truncate text-xs font-medium text-muted">
              {location.address}
            </div>
          </Loc>
        ) : (
          <div className="flex-1" />
        )}

        {desktopNav ? (
          <nav className="hidden items-center gap-1 lg:flex">{desktopNav}</nav>
        ) : null}
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
