import * as React from "react";
import { cn } from "../lib/cn";
import type { CategoryCardData, CategoryTone } from "../types";

const tones: Record<CategoryTone, string> = {
  green: "bg-brand-light",
  orange: "bg-accent-light",
  blue: "bg-info-light",
  pink: "bg-danger-light",
  purple: "bg-[#F3E5F5]",
  cyan: "bg-[#E0F7FA]",
  yellow: "bg-warning-light",
  gray: "bg-surface-alt",
};

export interface CategoryCardProps {
  category: CategoryCardData;
  href?: string;
  linkComponent?: React.ElementType;
  className?: string;
}

export function CategoryCard({
  category,
  href,
  linkComponent: Link = "a",
  className,
}: CategoryCardProps) {
  const Comp: React.ElementType = href ? Link : "div";
  const props = href ? { href } : {};
  return (
    <Comp
      {...props}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-center transition active:scale-95",
        className,
      )}
    >
      <span
        className={cn(
          "grid aspect-square w-full place-items-center rounded-xl text-3xl",
          tones[category.tone ?? "green"],
        )}
      >
        {category.icon}
      </span>
      <span className="text-2xs font-semibold leading-tight text-ink">
        {category.name}
      </span>
    </Comp>
  );
}
