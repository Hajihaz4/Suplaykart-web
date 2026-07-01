import "server-only";
import { cookies } from "next/headers";

const COOKIE = "sk_searches";

export async function getSearchHistory(): Promise<string[]> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}
