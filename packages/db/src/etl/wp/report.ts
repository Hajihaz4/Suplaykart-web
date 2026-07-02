/** Per-phase reconciliation report writer (JSON + Markdown, PII-free). */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

export interface PhaseReport {
  phase: string;
  dryRun: boolean;
  startedAt: string;
  finishedAt?: string;
  stats: Record<string, number>;
  warnings: string[];
  notes: string[];
}

export function newReport(phase: string, dryRun: boolean): PhaseReport {
  return {
    phase,
    dryRun,
    startedAt: new Date().toISOString(),
    stats: {},
    warnings: [],
    notes: [],
  };
}

export function bump(r: PhaseReport, key: string, by = 1): void {
  r.stats[key] = (r.stats[key] ?? 0) + by;
}

export function warn(r: PhaseReport, msg: string): void {
  // warnings are aggregate-only by convention; callers must not pass PII
  if (r.warnings.length < 500) r.warnings.push(msg);
  else if (r.warnings.length === 500) r.warnings.push("(further warnings truncated)");
}

export function reportsDir(): string {
  const dir =
    process.env.WP_WORKSPACE ?? path.join(os.homedir(), "Suplaykart-Migration");
  return path.join(dir, "analysis", "reports");
}

export function writeReport(r: PhaseReport): string {
  r.finishedAt = new Date().toISOString();
  const dir = reportsDir();
  mkdirSync(dir, { recursive: true });
  const stamp = r.startedAt.replace(/[:.]/g, "-");
  const base = path.join(dir, `${r.phase}${r.dryRun ? "-dryrun" : ""}-${stamp}`);
  writeFileSync(`${base}.json`, JSON.stringify(r, null, 2));
  const md = [
    `# ETL report — ${r.phase}${r.dryRun ? " (DRY RUN)" : ""}`,
    ``,
    `Started ${r.startedAt} · finished ${r.finishedAt}`,
    ``,
    `## Stats`,
    ...Object.entries(r.stats).map(([k, v]) => `- **${k}**: ${v}`),
    ``,
    ...(r.notes.length ? [`## Notes`, ...r.notes.map((n) => `- ${n}`), ``] : []),
    ...(r.warnings.length
      ? [`## Warnings (${r.warnings.length})`, ...r.warnings.map((w) => `- ${w}`)]
      : [`No warnings.`]),
  ].join("\n");
  writeFileSync(`${base}.md`, md);
  return `${base}.md`;
}
