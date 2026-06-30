"use client";
import * as React from "react";
import { cn } from "../lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-white px-3.5 text-sm font-medium text-ink outline-none transition placeholder:text-muted-light focus:border-brand",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
