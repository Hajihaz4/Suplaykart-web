"use client";
import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "../lib/cn";
import { SearchBar } from "../components/search-bar";

export interface SearchHeaderProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onBack?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function SearchHeader({
  value,
  onValueChange,
  onBack,
  placeholder,
  autoFocus,
  className,
}: SearchHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border-light bg-surface",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-3">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-alt"
        >
          <ArrowLeft className="size-4 text-ink" />
        </button>
        <SearchBar
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          containerClassName="flex-1"
        />
      </div>
    </header>
  );
}
