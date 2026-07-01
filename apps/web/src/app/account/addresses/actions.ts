"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAddress,
  db,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
  type AddressInput,
} from "@suplaykart/db";
import type { AddressFormState } from "@suplaykart/ui";
import { requireCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { reverseGeocode, type ReverseGeoResult } from "@/lib/maps";

export async function reverseGeocodeAction(
  lat: number,
  lng: number,
): Promise<ReverseGeoResult | null> {
  const user = await requireCurrentUser();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // Proxies a paid external geocoder — cap per user to bound cost/abuse.
  if (!rateLimit(`geocode:${user.id}`, 30, 60_000).ok) return null;
  return reverseGeocode(lat, lng);
}

const schema = z.object({
  label: z.enum(["home", "work", "other"]),
  customLabel: z.string().trim().max(30),
  recipientName: z.string().trim().max(80),
  recipientPhone: z.union([
    z.literal(""),
    z.string().trim().regex(/^\d{10}$/, "Enter a valid 10-digit phone"),
  ]),
  house: z.string().trim().min(1, "House / flat is required").max(120),
  floor: z.string().trim().max(60),
  area: z.string().trim().max(120),
  landmark: z.string().trim().max(120),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  city: z.string().trim().min(1, "City is required").max(60),
  state: z.string().trim().min(1, "State is required").max(60),
  lat: z.string().optional(),
  lng: z.string().optional(),
  isDefault: z.boolean(),
});

const s = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

function coord(raw: string | undefined, max: number): number | null {
  if (!raw || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
}

function readForm(formData: FormData) {
  return {
    label: s(formData.get("label")),
    customLabel: s(formData.get("customLabel")),
    recipientName: s(formData.get("recipientName")),
    recipientPhone: s(formData.get("recipientPhone")),
    house: s(formData.get("house")),
    floor: s(formData.get("floor")),
    area: s(formData.get("area")),
    landmark: s(formData.get("landmark")),
    pincode: s(formData.get("pincode")),
    city: s(formData.get("city")),
    state: s(formData.get("state")),
    lat: s(formData.get("lat")),
    lng: s(formData.get("lng")),
    isDefault: formData.get("isDefault") === "on",
  };
}

function toInput(data: z.infer<typeof schema>): AddressInput {
  return {
    label: data.label,
    customLabel: data.customLabel.trim() || null,
    recipientName: data.recipientName.trim() || null,
    recipientPhone: data.recipientPhone || null,
    house: data.house.trim(),
    floor: data.floor.trim() || null,
    area: data.area.trim() || null,
    landmark: data.landmark.trim() || null,
    pincode: data.pincode,
    city: data.city.trim(),
    state: data.state.trim(),
    lat: coord(data.lat, 90),
    lng: coord(data.lng, 180),
    isDefault: data.isDefault,
  };
}

export async function createAddressAction(
  _prev: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const user = await requireCurrentUser();
  const parsed = schema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await createAddress(db, user.id, toInput(parsed.data));
  revalidatePath("/account/addresses");
  revalidatePath("/account");
  redirect("/account/addresses");
}

export async function updateAddressAction(
  id: string,
  _prev: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const user = await requireCurrentUser();
  const parsed = schema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const updated = await updateAddress(db, user.id, id, toInput(parsed.data));
  if (!updated) return { error: "Address not found." };
  revalidatePath("/account/addresses");
  revalidatePath("/account");
  redirect("/account/addresses");
}

export async function deleteAddressAction(id: string) {
  const user = await requireCurrentUser();
  await deleteAddress(db, user.id, id);
  revalidatePath("/account/addresses");
  revalidatePath("/account");
}

export async function setDefaultAddressAction(id: string) {
  const user = await requireCurrentUser();
  await setDefaultAddress(db, user.id, id);
  revalidatePath("/account/addresses");
  revalidatePath("/account");
}
