"use client";
import { useActionState } from "react";
import {
  completeOnboardingAction,
  type OnboardingState,
} from "@/app/onboarding/actions";

const inputCls =
  "w-full rounded-xl border border-border-light bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none";

export function OnboardingForm({
  defaultName,
}: {
  defaultName?: string | null;
}) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    completeOnboardingAction,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="mb-1 block text-2xs font-bold uppercase tracking-wide text-muted">
          Your name
        </label>
        <input
          name="name"
          required
          defaultValue={defaultName ?? ""}
          placeholder="Full name"
          className={inputCls}
        />
      </div>
      <div className="rounded-xl bg-surface-alt p-3">
        <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted">
          Default delivery address
        </p>
        <div className="space-y-2">
          <input
            name="house"
            required
            placeholder="House / flat, building"
            className={inputCls}
          />
          <input name="area" placeholder="Area / street (optional)" className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="pincode"
              required
              inputMode="numeric"
              placeholder="Pincode"
              className={inputCls}
            />
            <input
              name="city"
              required
              defaultValue="Nagore"
              placeholder="City"
              className={inputCls}
            />
          </div>
          <input
            name="state"
            required
            defaultValue="Tamil Nadu"
            placeholder="State"
            className={inputCls}
          />
        </div>
      </div>
      {state.error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Setting up…" : "Start shopping"}
      </button>
    </form>
  );
}
