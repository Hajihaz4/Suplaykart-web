import * as React from "react";
import { cn } from "@suplaykart/ui";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-light bg-surface px-4 py-4 md:px-6">
      <div>
        <h1 className="text-lg font-extrabold text-ink">{title}</h1>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "brand" | "warning" | "danger";
}) {
  const toneCls =
    tone === "brand"
      ? "text-brand"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : "text-ink";
  return (
    <div className="rounded-xl border border-border-light bg-surface p-4">
      <div className="text-2xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-black", toneCls)}>{value}</div>
      {hint ? <div className="mt-0.5 text-2xs text-muted">{hint}</div> : null}
    </div>
  );
}

/** Simple responsive data table. `cols` = header labels. */
export function DataTable({
  cols,
  children,
  empty,
}: {
  cols: string[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-light bg-surface">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-light text-2xs uppercase tracking-wide text-muted">
            {cols.map((c) => (
              <th key={c} className="px-4 py-3 font-bold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {empty ? (
            <tr>
              <td
                colSpan={cols.length}
                className="px-4 py-10 text-center text-sm text-muted"
              >
                Nothing here yet.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-4 py-3 align-middle text-ink", className)}>
      {children}
    </td>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "brand" | "danger" | "warning";
}) {
  const cls =
    tone === "brand"
      ? "bg-brand-light text-brand"
      : tone === "danger"
        ? "bg-danger-light text-danger"
        : tone === "warning"
          ? "bg-warning-light text-warning"
          : "bg-surface-alt text-muted";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold",
        cls,
      )}
    >
      {children}
    </span>
  );
}
