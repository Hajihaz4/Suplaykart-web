import * as React from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { cn } from "../lib/cn";

export interface AddressChipProps {
  label: string;
  address: string;
  href?: string;
  linkComponent?: React.ElementType;
  className?: string;
}

export function AddressChip({
  label,
  address,
  href,
  linkComponent: Link = "a",
  className,
}: AddressChipProps) {
  const Comp: React.ElementType = href ? Link : "button";
  const props = href ? { href } : { type: "button" as const };
  return (
    <Comp
      {...props}
      className={cn(
        "flex items-center gap-2 rounded-full bg-surface-alt px-3 py-2 text-left",
        className,
      )}
    >
      <MapPin className="size-4 shrink-0 text-brand" />
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-xs font-extrabold text-ink">
          <span>{label}</span>
          <ChevronDown className="size-3 text-muted" />
        </span>
        <span className="block max-w-[12rem] truncate text-2xs text-muted">
          {address}
        </span>
      </span>
    </Comp>
  );
}
