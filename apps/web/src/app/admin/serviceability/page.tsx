import {
  db,
  getServiceConfig,
  listServiceableAreas,
  requireDefaultSupplier,
} from "@suplaykart/db";
import { AdminPageHeader } from "@/components/admin-ui";
import { AdminServiceability } from "@/components/admin-serviceability";

export const dynamic = "force-dynamic";

export default async function AdminServiceabilityPage() {
  const supplier = await requireDefaultSupplier(db);
  const [config, areas] = await Promise.all([
    getServiceConfig(db, supplier.id),
    listServiceableAreas(db, supplier.id),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Serviceability"
        description={`Mode: ${config.mode} · ${areas.length} area${areas.length === 1 ? "" : "s"}`}
      />
      <AdminServiceability
        config={config}
        areas={areas.map((a) => ({
          id: a.id,
          pincode: a.pincode,
          city: a.city,
          areaName: a.areaName,
          status: a.status,
          isActive: a.isActive,
        }))}
      />
    </>
  );
}
