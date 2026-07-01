"use server";
import { cookies } from "next/headers";

const COOKIE = "sk_recent";
const MAX = 12;

/** Record a product view in the recently-viewed cookie (most-recent first). */
export async function recordViewAction(slug: string): Promise<void> {
  if (!/^[a-z0-9-]+$/.test(slug)) return;
  const jar = await cookies();
  const prev = (jar.get(COOKIE)?.value ?? "").split(",").filter(Boolean);
  const next = [slug, ...prev.filter((s) => s !== slug)].slice(0, MAX);
  jar.set(COOKIE, next.join(","), {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    path: "/",
  });
}
