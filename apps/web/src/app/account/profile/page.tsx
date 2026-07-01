import { ProfileForm } from "@suplaykart/ui";
import { AccountHeader } from "@/components/account-header";
import { requireCurrentUser } from "@/lib/auth";
import { updateProfileAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireCurrentUser();
  return (
    <div className="min-h-screen bg-surface-alt">
      <AccountHeader title="Profile" />
      <main className="mx-auto w-full max-w-xl bg-surface">
        <ProfileForm
          action={updateProfileAction}
          defaultValues={{
            name: user.name,
            email: user.email,
            phone: user.phone,
          }}
        />
      </main>
    </div>
  );
}
