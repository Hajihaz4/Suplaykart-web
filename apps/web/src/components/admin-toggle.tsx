"use client";
import * as React from "react";

export function AdminToggle({
  id,
  active,
  action,
}: {
  id: string;
  active: boolean;
  action: (id: string, active: boolean) => Promise<void>;
}) {
  const [pending, start] = React.useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await action(id, !active);
        })
      }
      className="text-2xs font-bold text-muted hover:text-ink disabled:opacity-50"
    >
      {active ? "Hide" : "Show"}
    </button>
  );
}
