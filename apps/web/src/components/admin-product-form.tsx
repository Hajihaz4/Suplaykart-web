"use client";
import * as React from "react";
import { useActionState } from "react";
import type { ReactNode } from "react";
import type { FormState } from "@/app/admin/actions";

const inputCls =
  "w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

interface Cat {
  id: string;
  name: string;
}

export interface ProductDefaults {
  name?: string;
  slug?: string;
  brand?: string | null;
  categoryId?: string;
  description?: string | null;
  isVeg?: boolean | null;
  emoji?: string | null;
  priceRupees?: number;
  mrpRupees?: number | null;
  unit?: string;
}

export function AdminProductForm({
  action,
  categories,
  defaults = {},
  submitLabel,
  showStockSlug = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  categories: Cat[];
  defaults?: ProductDefaults;
  submitLabel: string;
  showStockSlug?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const veg =
    defaults.isVeg === true ? "veg" : defaults.isVeg === false ? "nonveg" : "na";

  return (
    <form action={formAction} className="max-w-2xl space-y-4 p-4 md:p-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input name="name" required defaultValue={defaults.name} className={inputCls} />
        </Field>
        {showStockSlug ? (
          <Field label="Slug">
            <input
              name="slug"
              required
              defaultValue={defaults.slug}
              placeholder="lowercase-hyphen"
              className={inputCls}
            />
          </Field>
        ) : null}
        <Field label="Brand">
          <input name="brand" defaultValue={defaults.brand ?? ""} className={inputCls} />
        </Field>
        <Field label="Category">
          <select
            name="categoryId"
            required
            defaultValue={defaults.categoryId ?? ""}
            className={inputCls}
          >
            <option value="" disabled>
              Select…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit (e.g. 500 g)">
          <input name="unit" required defaultValue={defaults.unit} className={inputCls} />
        </Field>
        <Field label="Emoji">
          <input
            name="emoji"
            maxLength={4}
            defaultValue={defaults.emoji ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Price (₹)">
          <input
            name="price"
            required
            type="number"
            step="0.01"
            defaultValue={defaults.priceRupees}
            className={inputCls}
          />
        </Field>
        <Field label="MRP (₹)">
          <input
            name="mrp"
            type="number"
            step="0.01"
            defaultValue={defaults.mrpRupees ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Diet">
          <select name="isVeg" defaultValue={veg} className={inputCls}>
            <option value="na">Not specified</option>
            <option value="veg">Veg</option>
            <option value="nonveg">Non-veg</option>
          </select>
        </Field>
        {showStockSlug ? (
          <Field label="Initial stock">
            <input
              name="initialStock"
              type="number"
              defaultValue={0}
              className={inputCls}
            />
          </Field>
        ) : null}
      </div>
      <Field label="Description">
        <textarea
          name="description"
          rows={3}
          defaultValue={defaults.description ?? ""}
          className={inputCls}
        />
      </Field>
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
