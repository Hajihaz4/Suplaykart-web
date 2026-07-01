"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createCategory,
  createProduct,
  db,
  requireDefaultSupplier,
  updateCategory,
  updateProduct,
  upsertStoreSettings,
} from "@suplaykart/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Input-validating (zod) admin form actions. This module imports zod, so it is
 * imported ONLY by client form components (never by a Server Component page) —
 * see ./mutations.ts for the rationale. Non-validated toggle/status/adjust/
 * block actions live in ./mutations.ts.
 */

export interface FormState {
  error?: string | null;
  ok?: boolean;
}

const slug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, or hyphens");
/** Rupees entered in the admin UI → integer paise for storage. */
const rupees = z.coerce.number().min(0).max(200000);
const toPaise = (r: number) => Math.round(r * 100);

// ── products ────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(1).max(120),
  slug,
  brand: z.string().max(80).optional(),
  categoryId: z.string().uuid("Pick a category"),
  description: z.string().max(600).optional(),
  isVeg: z.enum(["veg", "nonveg", "na"]),
  emoji: z.string().max(8).optional(),
  price: rupees,
  mrp: rupees.optional(),
  unit: z.string().min(1).max(40),
  initialStock: z.coerce.number().int().min(0).max(100000).optional(),
});

function readProduct(fd: FormData) {
  return {
    name: fd.get("name"),
    slug: fd.get("slug"),
    brand: (fd.get("brand") as string) || undefined,
    categoryId: fd.get("categoryId"),
    description: (fd.get("description") as string) || undefined,
    isVeg: fd.get("isVeg"),
    emoji: (fd.get("emoji") as string) || undefined,
    price: fd.get("price"),
    mrp: (fd.get("mrp") as string) || undefined,
    unit: fd.get("unit"),
    initialStock: (fd.get("initialStock") as string) || undefined,
  };
}

const vegValue = (v: "veg" | "nonveg" | "na") =>
  v === "veg" ? true : v === "nonveg" ? false : null;

export async function createProductAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  const parsed = productSchema.safeParse(readProduct(fd));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  try {
    await createProduct(db, supplier.id, admin.id, {
      name: d.name,
      slug: d.slug,
      brand: d.brand ?? null,
      categoryId: d.categoryId,
      description: d.description ?? null,
      isVeg: vegValue(d.isVeg),
      emoji: d.emoji ?? null,
      price: toPaise(d.price),
      mrp: d.mrp != null ? toPaise(d.mrp) : null,
      unit: d.unit,
      initialStock: d.initialStock ?? 0,
    });
  } catch {
    return { error: "Could not create product (is the slug unique?)." };
  }
  revalidateTag("products");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProductAction(
  productId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  const parsed = productSchema
    .omit({ slug: true, initialStock: true })
    .safeParse(readProduct(fd));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  await updateProduct(db, supplier.id, admin.id, productId, {
    name: d.name,
    brand: d.brand ?? null,
    categoryId: d.categoryId,
    description: d.description ?? null,
    isVeg: vegValue(d.isVeg),
    emoji: d.emoji ?? null,
    price: toPaise(d.price),
    mrp: d.mrp != null ? toPaise(d.mrp) : null,
    unit: d.unit,
  });
  revalidateTag("products");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

// ── categories ──────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1).max(80),
  slug,
  icon: z.string().max(8).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

function readCategory(fd: FormData) {
  return {
    name: fd.get("name"),
    slug: fd.get("slug"),
    icon: (fd.get("icon") as string) || undefined,
    sortOrder: (fd.get("sortOrder") as string) || undefined,
  };
}

export async function createCategoryAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  const parsed = categorySchema.safeParse(readCategory(fd));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  try {
    await createCategory(db, supplier.id, admin.id, {
      name: d.name,
      slug: d.slug,
      icon: d.icon ?? null,
      sortOrder: d.sortOrder ?? 0,
    });
  } catch {
    return { error: "Could not create category (is the slug unique?)." };
  }
  revalidateTag("categories");
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function updateCategoryAction(
  categoryId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  const parsed = categorySchema.safeParse(readCategory(fd));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  await updateCategory(db, supplier.id, admin.id, categoryId, {
    name: d.name,
    slug: d.slug,
    icon: d.icon ?? null,
    sortOrder: d.sortOrder ?? 0,
  });
  revalidateTag("categories");
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

// ── settings ────────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  isOpen: z.coerce.boolean(),
  holidayMode: z.coerce.boolean(),
  holidayNote: z.string().max(140).optional(),
  deliveryFee: rupees,
  handlingFee: rupees,
  freeDeliveryThreshold: rupees,
  taxInclusive: z.coerce.boolean(),
  gstRate: z.string().max(6).optional(),
});

export async function saveSettingsAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const supplier = await requireDefaultSupplier(db);
  const parsed = settingsSchema.safeParse({
    isOpen: fd.get("isOpen") === "on",
    holidayMode: fd.get("holidayMode") === "on",
    holidayNote: (fd.get("holidayNote") as string) || undefined,
    deliveryFee: fd.get("deliveryFee"),
    handlingFee: fd.get("handlingFee"),
    freeDeliveryThreshold: fd.get("freeDeliveryThreshold"),
    taxInclusive: fd.get("taxInclusive") === "on",
    gstRate: (fd.get("gstRate") as string) || undefined,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  await upsertStoreSettings(db, supplier.id, admin.id, {
    isOpen: d.isOpen,
    holidayMode: d.holidayMode,
    holidayNote: d.holidayNote ?? null,
    deliveryFee: toPaise(d.deliveryFee),
    handlingFee: toPaise(d.handlingFee),
    freeDeliveryThreshold: toPaise(d.freeDeliveryThreshold),
    taxInclusive: d.taxInclusive,
    gstRate: d.gstRate ?? null,
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}
