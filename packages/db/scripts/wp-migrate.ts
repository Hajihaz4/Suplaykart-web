/**
 * WP → Suplaykart migration CLI.
 *
 *   pnpm --filter @suplaykart/db wp:migrate -- <phases> [--dry-run] [--limit N]
 *
 *   phases: comma list of a,b,c,d,e or "all"      (e.g. "a,c,d,e")
 *   --dry-run  rehearse EVERYTHING against in-memory PGlite (no network,
 *              no writes anywhere except reports on disk)
 *   --limit N  cap products processed in phase A (smoke tests)
 *
 * Live runs require WP_MIGRATION_DATABASE_URL (fresh Neon branch) and refuse
 * to run when it equals DATABASE_URL. Nothing here ever touches production.
 * Dump path: WP_DUMP_PATH (default: ~/Downloads/Suplaykart backup/suplaykart.sql.gz)
 */
import "dotenv/config"; // resolve DATABASE_URL for the production cross-check
import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";
import { loadWpData } from "../src/etl/wp/wp-load";
import { bootstrapStaging, connectTarget, setPhaseState } from "../src/etl/wp/target";
import { newReport, writeReport } from "../src/etl/wp/report";
import { runPhaseA } from "../src/etl/wp/phase-a-catalog";
import { runPhaseB } from "../src/etl/wp/phase-b-images";
import { runPhaseC } from "../src/etl/wp/phase-c-customers";
import { runPhaseD } from "../src/etl/wp/phase-d-orders";
import { runPhaseE } from "../src/etl/wp/phase-e-validate";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined;
  const phaseArg = args.find((a) => !a.startsWith("--") && a !== String(limit)) ?? "";
  const phases = phaseArg === "all" ? ["a", "b", "c", "d", "e"] : phaseArg.split(",").filter(Boolean);
  if (!phases.length || phases.some((p) => !"abcde".includes(p))) {
    console.error('Usage: wp:migrate <a,b,c,d,e|all> [--dry-run] [--limit N]');
    process.exit(2);
  }

  const dumpPath =
    process.env.WP_DUMP_PATH ??
    path.join(os.homedir(), "Downloads", "Suplaykart backup", "suplaykart.sql.gz");
  if (!existsSync(dumpPath)) {
    console.error(`Dump not found: ${dumpPath} (set WP_DUMP_PATH)`);
    process.exit(2);
  }

  console.log(`[wp-migrate] mode=${dryRun ? "DRY-RUN (PGlite rehearsal)" : "LIVE (fresh branch)"}`);
  console.log(`[wp-migrate] loading dump: ${dumpPath}`);
  const t0 = Date.now();
  const data = await loadWpData(dumpPath);
  console.log(
    `[wp-migrate] dump loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s — ` +
      `${data.posts.size} posts, ${data.orders.size} orders, ${data.users.size} users`,
  );

  const target = await connectTarget(dryRun);
  let failed = false;
  try {
    await bootstrapStaging(target.db);
    const runners: Record<string, () => Promise<unknown>> = {
      a: async () => {
        const r = newReport("phase-a-catalog", dryRun);
        await setPhaseState(target.db, "a", "running", {});
        await runPhaseA(target.db, data, r, { limit });
        await setPhaseState(target.db, "a", "completed", r.stats);
        console.log(`[phase A] ${JSON.stringify(r.stats)}\n  report: ${writeReport(r)}`);
      },
      b: async () => {
        const r = newReport("phase-b-images", dryRun);
        await setPhaseState(target.db, "b", "running", {});
        await runPhaseB(target.db, data, r);
        await setPhaseState(target.db, "b", "completed", r.stats);
        console.log(`[phase B] ${JSON.stringify(r.stats)}\n  report: ${writeReport(r)}`);
      },
      c: async () => {
        const r = newReport("phase-c-customers", dryRun);
        await setPhaseState(target.db, "c", "running", {});
        await runPhaseC(target.db, data, r);
        await setPhaseState(target.db, "c", "completed", r.stats);
        console.log(`[phase C] ${JSON.stringify(r.stats)}\n  report: ${writeReport(r)}`);
      },
      d: async () => {
        const r = newReport("phase-d-orders", dryRun);
        await setPhaseState(target.db, "d", "running", {});
        await runPhaseD(target.db, data, r);
        await setPhaseState(target.db, "d", "completed", r.stats);
        console.log(`[phase D] ${JSON.stringify(r.stats)}\n  report: ${writeReport(r)}`);
      },
      e: async () => {
        const r = newReport("phase-e-validate", dryRun);
        const { passed, failures } = await runPhaseE(target.db, data, r);
        await setPhaseState(target.db, "e", passed ? "completed" : "failed", r.stats);
        console.log(`[phase E] ${JSON.stringify(r.stats)}\n  report: ${writeReport(r)}`);
        if (!passed) {
          console.error(`[phase E] VALIDATION FAILED:\n  - ${failures.join("\n  - ")}`);
          failed = true;
        }
      },
    };
    for (const p of phases) await runners[p]!();
  } finally {
    await target.close();
  }
  if (failed) process.exit(1);
  console.log("[wp-migrate] done.");
}

main().catch((err) => {
  console.error("[wp-migrate] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
