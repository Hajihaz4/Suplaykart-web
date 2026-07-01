"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAddress, db, updateProfile } from "@suplaykart/db";
import { requireCurrentUser } from "@/lib/auth";

export interface OnboardingState {
  error?: string | null;
}

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  house: z.string().trim().min(1, "House / flat is required").max(120),
  area: z.string().trim().max(120),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  city: z.string().trim().min(1, "City is required").max(60),
  state: z.string().trim().min(1, "State is required").max(60),
});

export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireCurrentUser();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    house: formData.get("house"),
    area: formData.get("area"),
    pincode: formData.get("pincode"),
    city: formData.get("city"),
    state: formData.get("state"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  await updateProfile(db, user.id, { name: d.name, email: user.email });
  await createAddress(db, user.id, {
    label: "home",
    house: d.house,
    area: d.area || null,
    pincode: d.pincode,
    city: d.city,
    state: d.state,
    isDefault: true,
  });
  redirect("/");
}
