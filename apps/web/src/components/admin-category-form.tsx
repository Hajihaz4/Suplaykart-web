"use client";
import { useActionState } from "react";
import type { ReactNode } from "react";
import type { FormState } from "@/app/admin/actions";

const inputCls =
  "w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

export interface CategoryDefaults {
  name?: string;
  slug?: string;
  icon?: string | null;
  sortOrder?: number;
}

export function AdminCategoryForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  defaults?: CategoryDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="max-w-lg space-y-4 p-4 md:p-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input name="name" required defaultValue={defaults.name} className={inputCls} />
        </Field>
        <Field label="Slug">
          <input
            name="slug"
            required
            defaultValue={defaults.slug}
            placeholder="lowercase-hyphen"
            className={inputCls}
          />
        </Field>
        <Field label="Icon (emoji)">
          <input
            name="icon"
            maxLength={4}
            defaultValue={defaults.icon ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Sort order">
          <input
            name="sortOrder"
            type="number"
            defaultValue={defaults.sortOrder ?? 0}
            className={inputCls}
          />
        </Field>
      </div>
      {state.error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="h-11 rounded-xl bg-brand px-6 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-2xs font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
