"use client";
import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../lib/cn";

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  size = "md",
  className,
}: QuantityStepperProps) {
  const height = size === "sm" ? "h-8" : "h-10";
  const cell = size === "sm" ? "w-7" : "w-9";
  return (
    <div
      className={cn(
        "inline-flex items-center overflow-hidden rounded-lg bg-brand text-white",
        height,
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "grid h-full place-items-center disabled:opacity-50",
          cell,
        )}
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-[1.25rem] text-center text-sm font-extrabold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(
          "grid h-full place-items-center disabled:opacity-50",
          cell,
        )}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
