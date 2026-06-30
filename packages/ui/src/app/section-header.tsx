import * as React from "react";
import { cn } from "../lib/cn";

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  linkComponent?: React.ElementType;
  className?: string;
}

export function SectionHeader({
  title,
  actionLabel,
  actionHref,
  linkComponent: Link = "a",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn("flex items-center justify-between px-4 pb-2 pt-4", className)}
    >
      <h2 className="text-base font-extrabold tracking-tight text-ink">
        {title}
      </h2>
      {actionLabel ? (
        actionHref ? (
          <Link href={actionHref} className="text-xs font-bold text-brand">
            {actionLabel} ›
          </Link>
        ) : (
          <span className="text-xs font-bold text-brand">{actionLabel} ›</span>
        )
      ) : null}
    </div>
  );
}
