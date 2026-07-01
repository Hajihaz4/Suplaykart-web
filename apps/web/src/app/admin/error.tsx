"use client";
import * as React from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("admin_error", error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div>
        <h1 className="text-lg font-extrabold text-ink">Admin error</h1>
        <p className="mt-1 text-sm text-muted">
          {error.message || "Something went wrong loading this page."}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
