"use client";
import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "../lib/cn";

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
}

export function SearchBar({
  value,
  onValueChange,
  onClear,
  placeholder = "Search for products…",
  className,
  containerClassName,
  ...props
}: SearchBarProps) {
  const [internal, setInternal] = React.useState("");
  const current = value ?? internal;

  return (
    <div
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-xl bg-surface-alt px-3.5",
        containerClassName,
      )}
    >
      <Search className="size-4 shrink-0 text-muted-light" />
      <input
        value={current}
        onChange={(e) => {
          setInternal(e.target.value);
          onValueChange?.(e.target.value);
        }}
        placeholder={placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-light",
          className,
        )}
        {...props}
      />
      {current ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setInternal("");
            onValueChange?.("");
            onClear?.();
          }}
          className="grid size-5 shrink-0 place-items-center rounded-full bg-muted-light/70 text-white"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}
