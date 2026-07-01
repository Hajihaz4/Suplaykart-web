"use client";
import * as React from "react";
import { toggleCustomerBlockAction } from "@/app/admin/mutations";

export function AdminBlockCustomer({
  userId,
  blocked,
}: {
  userId: string;
  blocked: boolean;
}) {
  const [pending, start] = React.useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleCustomerBlockAction(userId, !blocked);
        })
      }
      className={`rounded-lg px-2.5 py-1 text-2xs font-bold disabled:opacity-50 ${
        blocked
          ? "bg-brand text-white"
          : "border border-danger/40 text-danger"
      }`}
    >
      {blocked ? "Unblock" : "Block"}
    </button>
  );
}
