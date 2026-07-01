"use client";
import { useActionState } from "react";
import type { ReactNode } from "react";
import { saveSettingsAction } from "@/app/admin/actions";

const inputCls =
  "w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

export interface SettingsDefaults {
  isOpen: boolean;
  holidayMode: boolean;
  holidayNote: string;
  deliveryFeeRupees: number;
  handlingFeeRupees: number;
  freeDeliveryThresholdRupees: number;
  taxInclusive: boolean;
  gstRate: string;
}

export function AdminSettingsForm({ defaults }: { defaults: SettingsDefaults }) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, {});
  return (
    <form action={formAction} className="max-w-xl space-y-4 p-4 md:p-6">
      <div className="space-y-3 rounded-xl border border-border-light bg-surface p-4">
        <Toggle name="isOpen" label="Store open" defaultChecked={defaults.isOpen} />
        <Toggle
          name="holidayMode"
          label="Holiday mode"
          defaultChecked={defaults.holidayMode}
        />
        <Field label="Holiday note">
          <input
            name="holidayNote"
            defaultValue={defaults.holidayNote}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Delivery fee (₹)">
          <input
            name="deliveryFee"
            type="number"
            step="0.01"
            defaultValue={defaults.deliveryFeeRupees}
            className={inputCls}
          />
        </Field>
        <Field label="Handling fee (₹)">
          <input
            name="handlingFee"
            type="number"
            step="0.01"
            defaultValue={defaults.handlingFeeRupees}
            className={inputCls}
          />
        </Field>
        <Field label="Free delivery over (₹)">
          <input
            name="freeDeliveryThreshold"
            type="number"
            step="0.01"
            defaultValue={defaults.freeDeliveryThresholdRupees}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border-light bg-surface p-4">
          <Toggle
            name="taxInclusive"
            label="Prices tax-inclusive"
            defaultChecked={defaults.taxInclusive}
          />
        </div>
        <Field label="GST rate (%)">
          <input name="gstRate" defaultValue={defaults.gstRate} className={inputCls} />
        </Field>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-brand-light px-3 py-2 text-xs font-semibold text-brand">
          Settings saved.
        </p>
      ) : null}

      <button
        disabled={pending}
        className="h-11 rounded-xl bg-brand px-6 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save settings"}
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

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span className="font-semibold text-ink">{label}</span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 accent-brand"
      />
    </label>
  );
}
