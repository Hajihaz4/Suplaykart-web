"use server";
import { cookies } from "next/headers";

const COOKIE = "sk_searches";
const MAX = 8;

export async function recordSearchAction(q: string): Promise<void> {
  const query = q.trim();
  if (!query || query.length > 60) return;
  const jar = await cookies();
  let prev: string[] = [];
  try {
    const parsed = JSON.parse(decodeURIComponent(jar.get(COOKIE)?.value ?? "[]"));
    if (Array.isArray(parsed)) prev = parsed;
  } catch {
    /* ignore */
  }
  const next = [
    query,
    ...prev.filter((s) => s.toLowerCase() !== query.toLowerCase()),
  ].slice(0, MAX);
  jar.set(COOKIE, encodeURIComponent(JSON.stringify(next)), {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    path: "/",
  });
}
