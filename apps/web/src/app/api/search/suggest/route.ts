import { NextResponse, type NextRequest } from "next/server";
import { db, requireDefaultSupplier, searchSuggestions } from "@suplaykart/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ suggestions: [] });
  // Public, unauthenticated DB read — throttle per client IP.
  const limit = rateLimit(`suggest:${clientKey(req.headers)}`, 40, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { suggestions: [] },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
    );
  }
  try {
    const supplier = await requireDefaultSupplier(db);
    const suggestions = await searchSuggestions(db, supplier.id, q, 6);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
