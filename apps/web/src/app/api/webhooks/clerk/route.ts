import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { db, upsertUserFromClerk } from "@suplaykart/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Clerk → DB sync. On user.created / user.updated, mirror the Clerk identity
 * (id + primary phone) into the local `users` table. Signature is verified by
 * Clerk's helper using CLERK_WEBHOOK_SIGNING_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    if (evt.type === "user.created" || evt.type === "user.updated") {
      const data = evt.data;
      const primary =
        data.phone_numbers.find(
          (p) => p.id === data.primary_phone_number_id,
        ) ?? data.phone_numbers[0];

      if (!primary) {
        return NextResponse.json(
          { ok: false, reason: "no phone number on user" },
          { status: 422 },
        );
      }

      const name =
        [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
      const email = data.email_addresses[0]?.email_address ?? null;

      await upsertUserFromClerk(db, {
        clerkUserId: data.id,
        phone: primary.phone_number,
        name,
        email,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "invalid" },
      { status: 400 },
    );
  }
}
