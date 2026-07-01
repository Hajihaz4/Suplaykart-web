import type { ReactNode } from "react";
import { db, getStoreSettings, requireDefaultSupplier } from "@suplaykart/db";
import { formatINR } from "@suplaykart/ui";
import { AdminPageHeader, Pill } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const supplier = await requireDefaultSupplier(db);
  const s = await getStoreSettings(db, supplier.id);

  return (
    <>
      <AdminPageHeader
        title="Store settings"
        description="Store configuration"
      />
      <div className="max-w-2xl space-y-3 p-4 md:p-6">
        {s ? (
          <div className="divide-y divide-border-light rounded-xl border border-border-light bg-surface">
            <Row
              label="Store status"
              value={
                <Pill tone={s.isOpen ? "brand" : "danger"}>
                  {s.isOpen ? "Open" : "Closed"}
                </Pill>
              }
            />
            <Row label="Holiday mode" value={s.holidayMode ? "On" : "Off"} />
            <Row label="Delivery fee" value={formatINR(s.deliveryFee)} />
            <Row
              label="Free delivery over"
              value={
                s.freeDeliveryThreshold
                  ? formatINR(s.freeDeliveryThreshold)
                  : "—"
              }
            />
            <Row label="Handling fee" value={formatINR(s.handlingFee)} />
            <Row label="Tax inclusive" value={s.taxInclusive ? "Yes" : "No"} />
            <Row label="GST rate" value={s.gstRate ? `${s.gstRate}%` : "—"} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
            Store settings not configured yet — using defaults.
          </div>
        )}
      </div>
    </>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
