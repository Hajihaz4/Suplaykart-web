import * as React from "react";
import { MapPin } from "lucide-react";
import { cn } from "../lib/cn";
import { Badge } from "./badge";

export interface AddressCardProps {
  labelText: string;
  addressLine: string;
  recipient?: string | null;
  isDefault?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function AddressCard({
  labelText,
  addressLine,
  recipient,
  isDefault,
  actions,
  className,
}: AddressCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-light bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-light text-brand">
          <MapPin className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-ink">{labelText}</span>
            {isDefault ? (
              <Badge variant="brand" size="sm">
                Default
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{addressLine}</p>
          {recipient ? (
            <p className="mt-1 text-xs font-semibold text-ink">{recipient}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="mt-3 flex items-center gap-4 border-t border-border-light pt-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
