import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface-alt p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand text-2xl text-white">
            🛒
          </div>
          <h1 className="mt-2 text-lg font-extrabold text-ink">
            Create your Suplaykart account
          </h1>
          <p className="text-xs text-muted">Fresh groceries, minutes away</p>
        </div>
        <SignUp
          appearance={{
            variables: { colorPrimary: "#0c831f" },
            elements: { card: "shadow-none border border-border-light" },
          }}
        />
      </div>
    </div>
  );
}
