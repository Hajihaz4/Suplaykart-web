"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: "bottom" | "right";
  children?: React.ReactNode;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  side = "bottom",
  children,
  className,
}: DrawerProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[250]" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 cursor-default bg-black/50"
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute bg-surface shadow-sheet",
          side === "bottom"
            ? "inset-x-0 bottom-0 max-h-[85%] overflow-y-auto rounded-t-2xl pb-6"
            : "inset-y-0 right-0 w-[88%] max-w-sm overflow-y-auto",
          className,
        )}
      >
        {side === "bottom" ? (
          <div className="mx-auto mt-3 mb-1 h-1 w-9 rounded-full bg-border" />
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
