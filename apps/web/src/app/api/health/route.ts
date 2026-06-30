import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness — process is up. No dependencies touched. */
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "suplaykart-web",
    time: new Date().toISOString(),
  });
}
