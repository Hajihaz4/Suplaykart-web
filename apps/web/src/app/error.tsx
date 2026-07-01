"use client";
import { Button } from "@suplaykart/ui";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-lg font-extrabold text-ink">Something went wrong</h2>
      <p className="max-w-xs text-sm text-muted">
        We couldn&apos;t load this page. The store may be temporarily
        unavailable — please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
