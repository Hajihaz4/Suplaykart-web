"use client";
import * as React from "react";
import { Button } from "./button";
import { Input } from "./input";

export type ProfileFormState = { error?: string | null; ok?: boolean };

export interface ProfileFormProps {
  action: (
    state: ProfileFormState,
    formData: FormData,
  ) => Promise<ProfileFormState>;
  defaultValues: { name?: string | null; email?: string | null; phone: string };
}

export function ProfileForm({ action, defaultValues }: ProfileFormProps) {
  const [state, formAction, pending] = React.useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4 p-4">
      <div>
        <div className="mb-1.5 text-xs font-bold text-muted">Name</div>
        <Input
          name="name"
          defaultValue={defaultValues.name ?? ""}
          placeholder="Your name"
          maxLength={80}
        />
      </div>
      <div>
        <div className="mb-1.5 text-xs font-bold text-muted">Mobile number</div>
        <Input value={defaultValues.phone} readOnly disabled />
        <p className="mt-1 text-2xs text-muted">
          Mobile number can&apos;t be changed.
        </p>
      </div>
      <div>
        <div className="mb-1.5 text-xs font-bold text-muted">Email (optional)</div>
        <Input
          name="email"
          type="email"
          defaultValue={defaultValues.email ?? ""}
          placeholder="you@example.com"
        />
      </div>
      {state.error ? (
        <p className="rounded-lg bg-danger-light px-3 py-2 text-xs font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-brand-light px-3 py-2 text-xs font-semibold text-brand">
          Profile updated ✓
        </p>
      ) : null}
      <Button type="submit" block size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
