/**
 * Promote a local user to a staff role so they can reach /admin.
 *
 *   pnpm --filter @suplaykart/db promote -- "+919000000001" owner
 *
 * role defaults to "owner". Requires DATABASE_URL in env.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/client";
import { users } from "../src/schema";

const ROLES = ["customer", "support", "ops", "admin", "owner"] as const;
type Role = (typeof ROLES)[number];

async function main() {
  const phone = process.argv[2];
  const role = (process.argv[3] ?? "owner") as Role;
  if (!phone) {
    console.error('usage: promote-admin.ts "<phone>" [role]');
    process.exit(1);
  }
  if (!ROLES.includes(role)) {
    console.error(`role must be one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }
  const res = await db
    .update(users)
    .set({ role })
    .where(eq(users.phone, phone))
    .returning({ id: users.id, phone: users.phone, role: users.role });
  if (!res[0]) {
    console.error(`no user found with phone ${phone}`);
    process.exit(1);
  }
  console.log("✓ promoted:", res[0]);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
