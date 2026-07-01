import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdmin();
  return (
    <AdminShell userName={user.name ?? "Staff"} role={user.role}>
      {children}
    </AdminShell>
  );
}
