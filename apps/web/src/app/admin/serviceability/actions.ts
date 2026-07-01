"use server";
import { revalidatePath } from "next/cache";
import {
  bulkAddPincodes,
  createServiceableArea,
  db,
  deleteServiceableArea,
  requireDefaultSupplier,
  setServiceableAreaActive,
  updateServiceConfig,
  updateServiceableArea,
  type ServiceMode,
  type ServiceStatus,
} from "@suplaykart/db";
import { requireAdmin } from "@/lib/auth";

export interface ActionResult {
  ok: boolean;
  error?: string;
  count?: number;
}

const PINCODE = /^\d{6}$/;

export interface AreaInput {
  pincode: string;
  city: string;
  areaName?: string;
  status: ServiceStatus;
  expectedLaunch?: string;
}

function validateArea(i: AreaInput): string | null {
  if (!PINCODE.test(i.pincode)) return "Pincode must be 6 digits.";
  if (!i.city.trim()) return "City is required.";
  if (i.status !== "live" && i.status !== "coming_soon")
    return "Invalid status.";
  return null;
}

function clean(i: AreaInput) {
  return {
    pincode: i.pincode,
    city: i.city.trim(),
    areaName: i.areaName?.trim() || null,
    status: i.status,
    expectedLaunch: i.expectedLaunch?.trim() || null,
  };
}

export async function createAreaAction(input: AreaInput): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  const err = validateArea(input);
  if (err) return { ok: false, error: err };
  const row = await createServiceableArea(db, supplier.id, admin.id, clean(input));
  if (!row) return { ok: false, error: `Pincode ${input.pincode} already exists.` };
  revalidatePath("/admin/serviceability");
  return { ok: true };
}

export async function updateAreaAction(
  id: string,
  input: AreaInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  const err = validateArea(input);
  if (err) return { ok: false, error: err };
  const row = await updateServiceableArea(db, supplier.id, admin.id, id, clean(input));
  if (!row) return { ok: false, error: "Area not found." };
  revalidatePath("/admin/serviceability");
  return { ok: true };
}

export async function toggleAreaAction(
  id: string,
  active: boolean,
): Promise<void> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  await setServiceableAreaActive(db, supplier.id, admin.id, id, active);
  revalidatePath("/admin/serviceability");
}

export async function deleteAreaAction(id: string): Promise<void> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  await deleteServiceableArea(db, supplier.id, admin.id, id);
  revalidatePath("/admin/serviceability");
}

export async function bulkAddPincodesAction(input: {
  pincodesRaw: string;
  city: string;
  status: ServiceStatus;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  if (!input.city.trim()) return { ok: false, error: "City is required." };
  const pincodes = Array.from(
    new Set(
      input.pincodesRaw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
  if (pincodes.length === 0)
    return { ok: false, error: "Enter at least one pincode." };
  const invalid = pincodes.find((p) => !PINCODE.test(p));
  if (invalid) return { ok: false, error: `Invalid pincode: ${invalid}` };
  const count = await bulkAddPincodes(db, supplier.id, admin.id, {
    pincodes,
    city: input.city.trim(),
    status: input.status,
  });
  revalidatePath("/admin/serviceability");
  return { ok: true, count };
}

export async function saveServiceConfigAction(input: {
  mode: ServiceMode;
  originLat: string;
  originLng: string;
  radiusKm: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  const modes: ServiceMode[] = ["all", "pincode", "radius"];
  if (!modes.includes(input.mode)) return { ok: false, error: "Invalid mode." };
  const lat = input.originLat.trim() === "" ? null : Number(input.originLat);
  const lng = input.originLng.trim() === "" ? null : Number(input.originLng);
  const radiusKm = Math.max(0, Math.round(Number(input.radiusKm) || 0));
  if (lat != null && (Number.isNaN(lat) || lat < -90 || lat > 90))
    return { ok: false, error: "Latitude must be between -90 and 90." };
  if (lng != null && (Number.isNaN(lng) || lng < -180 || lng > 180))
    return { ok: false, error: "Longitude must be between -180 and 180." };
  if (input.mode === "radius" && (lat == null || lng == null || radiusKm <= 0))
    return {
      ok: false,
      error: "Radius mode needs an origin (lat/lng) and a radius > 0.",
    };
  await updateServiceConfig(db, supplier.id, admin.id, {
    mode: input.mode,
    originLat: lat,
    originLng: lng,
    radiusKm,
  });
  revalidatePath("/admin/serviceability");
  return { ok: true };
}
