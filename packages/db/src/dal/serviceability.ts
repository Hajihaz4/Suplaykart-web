import { and, asc, eq } from "drizzle-orm";
import type { DB } from "../client";
import { serviceableAreas, storeSettings } from "../schema";
import { writeAudit } from "./admin-ops";

export type ServiceableArea = typeof serviceableAreas.$inferSelect;
export type ServiceStatus = "live" | "coming_soon";
export type ServiceMode = "all" | "pincode" | "radius";

export interface ServiceableAreaInput {
  pincode: string;
  city: string;
  areaName?: string | null;
  status: ServiceStatus;
  expectedLaunch?: string | null;
}

export interface ServiceConfig {
  mode: ServiceMode;
  originLat: number | null;
  originLng: number | null;
  radiusKm: number;
}

export type ServiceabilityReason =
  | "ok"
  | "unrestricted"
  | "out_of_zone"
  | "coming_soon"
  | "out_of_radius"
  | "no_location";

export interface ServiceabilityResult {
  serviceable: boolean;
  reason: ServiceabilityReason;
  status?: ServiceStatus;
  areaName?: string | null;
  expectedLaunch?: string | null;
}

// ── geo (pure; no maps API needed) ──────────────────────────────────────────

const EARTH_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km between two lat/lng points. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ── store service config (lives on the store_settings singleton) ────────────

const DEFAULT_CONFIG: ServiceConfig = {
  mode: "all",
  originLat: null,
  originLng: null,
  radiusKm: 0,
};

export async function getServiceConfig(
  db: DB,
  supplierId: string,
): Promise<ServiceConfig> {
  const [row] = await db
    .select({
      mode: storeSettings.serviceMode,
      originLat: storeSettings.originLat,
      originLng: storeSettings.originLng,
      radiusKm: storeSettings.deliveryRadiusKm,
    })
    .from(storeSettings)
    .where(eq(storeSettings.supplierId, supplierId))
    .limit(1);
  if (!row) return DEFAULT_CONFIG;
  return {
    mode: row.mode,
    originLat: row.originLat,
    originLng: row.originLng,
    radiusKm: row.radiusKm,
  };
}

export interface ServiceConfigInput {
  mode: ServiceMode;
  originLat?: number | null;
  originLng?: number | null;
  radiusKm: number;
}

export async function updateServiceConfig(
  db: DB,
  supplierId: string,
  actorUserId: string,
  input: ServiceConfigInput,
): Promise<ServiceConfig> {
  const values = {
    serviceMode: input.mode,
    originLat: input.originLat ?? null,
    originLng: input.originLng ?? null,
    deliveryRadiusKm: input.radiusKm,
  };
  // Upsert only the serviceability fields — other store settings are preserved.
  await db
    .insert(storeSettings)
    .values({ supplierId, ...values })
    .onConflictDoUpdate({ target: storeSettings.supplierId, set: values });
  await writeAudit(db, {
    actorUserId,
    action: "serviceability.config",
    entity: "settings",
    entityId: supplierId,
    summary: `Serviceability mode → ${input.mode}${input.mode === "radius" ? ` (${input.radiusKm} km)` : ""}`,
  });
  return getServiceConfig(db, supplierId);
}

// ── serviceable-area CRUD ───────────────────────────────────────────────────

export async function listServiceableAreas(
  db: DB,
  supplierId: string,
): Promise<ServiceableArea[]> {
  return db
    .select()
    .from(serviceableAreas)
    .where(eq(serviceableAreas.supplierId, supplierId))
    .orderBy(asc(serviceableAreas.pincode));
}

export async function createServiceableArea(
  db: DB,
  supplierId: string,
  actorUserId: string,
  input: ServiceableAreaInput,
): Promise<ServiceableArea | null> {
  const [row] = await db
    .insert(serviceableAreas)
    .values({
      supplierId,
      pincode: input.pincode,
      city: input.city,
      areaName: input.areaName ?? null,
      status: input.status,
      expectedLaunch: input.expectedLaunch ?? null,
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();
  if (!row) return null; // pincode already exists for this supplier
  await writeAudit(db, {
    actorUserId,
    action: "serviceability.area.create",
    entity: "serviceable_area",
    entityId: row.id,
    summary: `Added ${input.pincode} (${input.status})`,
  });
  return row;
}

export async function updateServiceableArea(
  db: DB,
  supplierId: string,
  actorUserId: string,
  id: string,
  input: ServiceableAreaInput,
): Promise<ServiceableArea | null> {
  const [row] = await db
    .update(serviceableAreas)
    .set({
      pincode: input.pincode,
      city: input.city,
      areaName: input.areaName ?? null,
      status: input.status,
      expectedLaunch: input.expectedLaunch ?? null,
    })
    .where(
      and(
        eq(serviceableAreas.id, id),
        eq(serviceableAreas.supplierId, supplierId),
      ),
    )
    .returning();
  if (!row) return null;
  await writeAudit(db, {
    actorUserId,
    action: "serviceability.area.update",
    entity: "serviceable_area",
    entityId: id,
    summary: `Updated ${input.pincode}`,
  });
  return row;
}

export async function setServiceableAreaActive(
  db: DB,
  supplierId: string,
  actorUserId: string,
  id: string,
  active: boolean,
): Promise<ServiceableArea | null> {
  const [row] = await db
    .update(serviceableAreas)
    .set({ isActive: active })
    .where(
      and(
        eq(serviceableAreas.id, id),
        eq(serviceableAreas.supplierId, supplierId),
      ),
    )
    .returning();
  if (row) {
    await writeAudit(db, {
      actorUserId,
      action: active
        ? "serviceability.area.enable"
        : "serviceability.area.disable",
      entity: "serviceable_area",
      entityId: id,
      summary: `${active ? "Enabled" : "Disabled"} ${row.pincode}`,
    });
  }
  return row ?? null;
}

export async function deleteServiceableArea(
  db: DB,
  supplierId: string,
  actorUserId: string,
  id: string,
): Promise<boolean> {
  const [row] = await db
    .delete(serviceableAreas)
    .where(
      and(
        eq(serviceableAreas.id, id),
        eq(serviceableAreas.supplierId, supplierId),
      ),
    )
    .returning({ pincode: serviceableAreas.pincode });
  if (!row) return false;
  await writeAudit(db, {
    actorUserId,
    action: "serviceability.area.delete",
    entity: "serviceable_area",
    entityId: id,
    summary: `Removed ${row.pincode}`,
  });
  return true;
}

/** Add many pincodes at once (skips duplicates). Returns the count inserted. */
export async function bulkAddPincodes(
  db: DB,
  supplierId: string,
  actorUserId: string,
  input: { pincodes: string[]; city: string; status: ServiceStatus },
): Promise<number> {
  const rows = input.pincodes.map((pincode) => ({
    supplierId,
    pincode,
    city: input.city,
    status: input.status,
    isActive: true,
  }));
  if (rows.length === 0) return 0;
  const inserted = await db
    .insert(serviceableAreas)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: serviceableAreas.id });
  if (inserted.length > 0) {
    await writeAudit(db, {
      actorUserId,
      action: "serviceability.bulk_add",
      entity: "serviceable_area",
      summary: `Bulk-added ${inserted.length} pincode(s) to ${input.city}`,
    });
  }
  return inserted.length;
}

// ── the check (used by checkout + address validation) ───────────────────────

export interface ServiceCheckInput {
  pincode?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export async function checkServiceability(
  db: DB,
  supplierId: string,
  input: ServiceCheckInput,
): Promise<ServiceabilityResult> {
  const config = await getServiceConfig(db, supplierId);

  if (config.mode === "all") {
    return { serviceable: true, reason: "unrestricted" };
  }

  // Radius mode with coordinates available → distance rule.
  if (
    config.mode === "radius" &&
    config.originLat != null &&
    config.originLng != null &&
    config.radiusKm > 0 &&
    input.lat != null &&
    input.lng != null
  ) {
    const dist = haversineKm(
      { lat: config.originLat, lng: config.originLng },
      { lat: input.lat, lng: input.lng },
    );
    return dist <= config.radiusKm
      ? { serviceable: true, reason: "ok" }
      : { serviceable: false, reason: "out_of_radius" };
  }
  // Radius mode without coordinates falls through to the pincode check
  // (graceful until the address map picker supplies coordinates).

  if (!input.pincode) return { serviceable: false, reason: "no_location" };

  const [area] = await db
    .select()
    .from(serviceableAreas)
    .where(
      and(
        eq(serviceableAreas.supplierId, supplierId),
        eq(serviceableAreas.pincode, input.pincode),
        eq(serviceableAreas.isActive, true),
      ),
    )
    .limit(1);

  if (!area) return { serviceable: false, reason: "out_of_zone" };
  if (area.status === "coming_soon") {
    return {
      serviceable: false,
      reason: "coming_soon",
      status: "coming_soon",
      areaName: area.areaName,
      expectedLaunch: area.expectedLaunch,
    };
  }
  return {
    serviceable: true,
    reason: "ok",
    status: "live",
    areaName: area.areaName,
  };
}
