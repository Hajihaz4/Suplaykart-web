import { redirect } from "next/navigation";
import { db, listAddresses } from "@suplaykart/db";
import { requireCurrentUser } from "@/lib/auth";
import { OnboardingForm } from "@/components/onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireCurrentUser();
  const addresses = await listAddresses(db, user.id);

  // Already onboarded → straight to the store.
  if (user.name?.trim() && addresses.length > 0) redirect("/");

  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <div className="mb-5 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand text-2xl text-white">
            🛒
          </div>
          <h1 className="mt-3 text-xl font-extrabold text-ink">
            Welcome to Suplaykart!
          </h1>
          <p className="mt-1 text-sm text-muted">
            Tell us a little about you so we can deliver to your door.
          </p>
        </div>
        <OnboardingForm defaultName={user.name} />
      </div>
    </div>
  );
}
