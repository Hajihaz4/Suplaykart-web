import "server-only";
import { cookies } from "next/headers";

const COOKIE = "sk_recent";
const MAX = 12;

/** Recently-viewed product slugs (most-recent first). */
export async function getRecentSlugs(): Promise<string[]> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return [];
  return raw.split(",").filter(Boolean).slice(0, MAX);
}
