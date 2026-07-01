import { NextResponse, type NextRequest } from "next/server";
import { db, requireDefaultSupplier, searchSuggestions } from "@suplaykart/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ suggestions: [] });
  try {
    const supplier = await requireDefaultSupplier(db);
    const suggestions = await searchSuggestions(db, supplier.id, q, 6);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
