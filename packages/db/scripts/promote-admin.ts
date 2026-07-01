/**
 * Promote a local user to a staff role so they can reach /admin.
 *
 * Accepts a phone, a Clerk user id (user_…), or the local uuid:
 *   pnpm --filter @suplaykart/db promote -- "+919000000001" owner
 *   pnpm --filter @suplaykart/db promote -- "user_3Fsw…"      owner
 *   pnpm --filter @suplaykart/db promote -- "db0ff402-…"      owner
 *
 * role defaults to "owner". Requires DATABASE_URL in env.
 */
import "dotenv/config";
import { eq, type SQL } from "drizzle-orm";
import { db } from "../src/client";
import { users } from "../src/schema";

const ROLES = ["customer", "support", "ops", "admin", "owner"] as const;
type Role = (typeof ROLES)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Match by uuid (id), Clerk id (user_…), or phone — whichever the arg looks like. */
function matcher(key: string): { where: SQL; kind: string } {
  if (UUID_RE.test(key)) return { where: eq(users.id, key), kind: "id" };
  if (key.startsWith("user_"))
    return { where: eq(users.clerkUserId, key), kind: "clerkUserId" };
  return { where: eq(users.phone, key), kind: "phone" };
}

async function main() {
  // tolerate a stray "--" separator from `pnpm run promote -- <args>`
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const key = args[0];
  const role = (args[1] ?? "owner") as Role;
  if (!key) {
    console.error('usage: promote-admin.ts "<phone | user_… | uuid>" [role]');
    process.exit(1);
  }
  if (!ROLES.includes(role)) {
    console.error(`role must be one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }
  const { where, kind } = matcher(key);
  const res = await db
    .update(users)
    .set({ role })
    .where(where)
    .returning({
      id: users.id,
      phone: users.phone,
      clerkUserId: users.clerkUserId,
      role: users.role,
    });
  if (!res[0]) {
    console.error(`no user found with ${kind} = ${key}`);
    process.exit(1);
  }
  console.log(`✓ promoted (matched by ${kind}):`, res[0]);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
