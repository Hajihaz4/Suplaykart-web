import * as React from "react";
import { ShoppingCart } from "lucide-react";
import { cn } from "../lib/cn";

export interface CartButtonProps {
  count?: number;
  href?: string;
  linkComponent?: React.ElementType;
  label?: boolean;
  className?: string;
}

export function CartButton({
  count = 0,
  href,
  linkComponent: Link = "a",
  label = false,
  className,
}: CartButtonProps) {
  const Comp: React.ElementType = href ? Link : "button";
  const props = href ? { href } : { type: "button" as const };
  return (
    <Comp
      {...props}
      aria-label={`Cart${count ? `, ${count} items` : ""}`}
      className={cn(
        "relative inline-flex items-center gap-2 rounded-full bg-surface-alt px-2.5 py-2 text-ink",
        label && "px-3.5",
        className,
      )}
    >
      <span className="relative">
        <ShoppingCart className="size-5" />
        {count > 0 ? (
          <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full border-2 border-surface bg-danger px-1 text-2xs font-extrabold leading-none text-white">
            {count}
          </span>
        ) : null}
      </span>
      {label ? <span className="text-sm font-bold">Cart</span> : null}
    </Comp>
  );
}
