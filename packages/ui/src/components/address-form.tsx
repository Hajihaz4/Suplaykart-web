"use client";
import * as React from "react";
import { cn } from "../lib/cn";
import { Button } from "./button";
import { Input } from "./input";

export type AddressLabel = "home" | "work" | "other";
export type AddressFormState = { error?: string | null; ok?: boolean };

export interface AddressFormValues {
  label?: AddressLabel;
  customLabel?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  house?: string | null;
  floor?: string | null;
  area?: string | null;
  landmark?: string | null;
  pincode?: string | null;
  city?: string | null;
  state?: string | null;
  isDefault?: boolean;
}

export interface AddressFormProps {
  action: (
    state: AddressFormState,
    formData: FormData,
  ) => Promise<AddressFormState>;
  defaultValues?: AddressFormValues;
  submitLabel?: string;
  /** Optional location capture (map picker / geolocation) rendered in-form. */
  locationSlot?: React.ReactNode;
}

const LABELS: { value: AddressLabel; icon: string; text: string }[] = [
  { value: "home", icon: "🏠", text: "Home" },
  { value: "work", icon: "💼", text: "Work" },
  { value: "other", icon: "📍", text: "Other" },
];

export function AddressForm({
  action,
  defaultValues = {},
  submitLabel = "Save address",
  locationSlot,
}: AddressFormProps) {
  const [state, formAction, pending] = React.useActionState(action, {});
  const [label, setLabel] = React.useState<AddressLabel>(
    defaultValues.label ?? "home",
  );
  const [forSomeone, setForSomeone] = React.useState(
    Boolean(defaultValues.recipientName || defaultValues.recipientPhone),
  );

  return (
    <form action={formAction} className="space-y-4 p-4">
      <input type="hidden" name="label" value={label} />
      {locationSlot}

      <div>
        <FieldLabel>Save as</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {LABELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLabel(l.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-bold transition",
                label === l.value
                  ? "border-brand bg-brand-light text-brand"
                  : "border-border text-ink",
              )}
            >
              <span className="text-lg">{l.icon}</span>
              {l.text}
            </button>
          ))}
        </div>
        {label === "other" ? (
          <Input
            name="customLabel"
            placeholder="Custom name (e.g. Mom's place)"
            defaultValue={defaultValues.customLabel ?? ""}
            maxLength={30}
            className="mt-2"
          />
        ) : null}
      </div>

      <Field name="house" label="House / Flat / Block No." required defaultValue={defaultValues.house ?? ""} placeholder="e.g. 3rd floor, 321 C-Block" />
      <Field name="floor" label="Floor (optional)" defaultValue={defaultValues.floor ?? ""} placeholder="e.g. 3rd floor" />
      <Field name="area" label="Area / Road (optional)" defaultValue={defaultValues.area ?? ""} placeholder="e.g. Main Road, Nagore" />
      <Field name="landmark" label="Landmark (optional)" defaultValue={defaultValues.landmark ?? ""} placeholder="e.g. Near Suplaykart Store" />

      <div className="grid grid-cols-3 gap-2">
        <Field name="pincode" label="Pincode" required inputMode="numeric" maxLength={6} defaultValue={defaultValues.pincode ?? ""} placeholder="611002" />
        <Field name="city" label="City" required defaultValue={defaultValues.city ?? ""} placeholder="Nagore" />
        <Field name="state" label="State" required defaultValue={defaultValues.state ?? ""} placeholder="Tamil Nadu" />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={forSomeone}
          onChange={(e) => setForSomeone(e.target.checked)}
          className="size-4 accent-brand"
        />
        Order is for someone else?
      </label>
      {forSomeone ? (
        <div className="grid grid-cols-2 gap-2">
          <Field name="recipientName" label="Receiver name" defaultValue={defaultValues.recipientName ?? ""} placeholder="Full name" />
          <Field name="recipientPhone" label="Receiver phone" inputMode="numeric" maxLength={10} defaultValue={defaultValues.recipientPhone ?? ""} placeholder="10-digit" />
        </div>
      ) : null}

      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={Boolean(defaultValues.isDefault)}
          className="size-4 accent-brand"
        />
        Set as default delivery address
      </label>

      {state.error ? (
        <p className="rounded-lg bg-danger-light px-3 py-2 text-xs font-semibold text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" block size="lg" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs font-bold text-muted">{children}</div>;
}

function Field({
  name,
  label,
  required,
  defaultValue,
  placeholder,
  inputMode,
  maxLength,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  inputMode?: "numeric";
  maxLength?: number;
}) {
  return (
    <div>
      <FieldLabel>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </FieldLabel>
      <Input
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
      />
    </div>
  );
}
