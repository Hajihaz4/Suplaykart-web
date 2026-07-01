import { db, getStoreSettings, requireDefaultSupplier } from "@suplaykart/db";
import { AdminPageHeader } from "@/components/admin-ui";
import { AdminSettingsForm } from "@/components/admin-settings-form";

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
      <AdminSettingsForm
        defaults={{
          isOpen: s?.isOpen ?? true,
          holidayMode: s?.holidayMode ?? false,
          holidayNote: s?.holidayNote ?? "",
          deliveryFeeRupees: (s?.deliveryFee ?? 2500) / 100,
          handlingFeeRupees: (s?.handlingFee ?? 0) / 100,
          freeDeliveryThresholdRupees: (s?.freeDeliveryThreshold ?? 20000) / 100,
          taxInclusive: s?.taxInclusive ?? true,
          gstRate: s?.gstRate ?? "",
        }}
      />
    </>
  );
}
