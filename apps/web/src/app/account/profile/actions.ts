"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, updateProfile } from "@suplaykart/db";
import type { ProfileFormState } from "@suplaykart/ui";
import { requireCurrentUser } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().max(80),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
});

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireCurrentUser();
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await updateProfile(db, user.id, {
    name: parsed.data.name.trim() || null,
    email: parsed.data.email || null,
  });
  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { ok: true };
}
