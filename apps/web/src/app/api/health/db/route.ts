import { NextResponse } from "next/server";
import { db, pingDatabase } from "@suplaykart/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Readiness — round-trips the database. 503 if the DB is unreachable. */
export async function GET() {
  try {
    const { latencyMs } = await pingDatabase(db);
    return NextResponse.json({ status: "ok", db: "up", latencyMs });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        db: "down",
        message: err instanceof Error ? err.message : "unknown error",
      },
      { status: 503 },
    );
  }
}
