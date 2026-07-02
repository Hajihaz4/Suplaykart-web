/**
 * Streaming MySQL-dump reader: yields parsed INSERT row tuples for a set of
 * target tables directly from the .sql.gz — no MySQL server required.
 *
 * MySQL extended INSERTs put an entire batch on one (possibly huge) line; the
 * tuple parser is a character state machine honoring single-quoted strings,
 * backslash escapes, and doubled-quote escapes.
 */
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";

/** A parsed field: string contents, or null for SQL NULL / raw numerics. */
export type Field = string | null;

export function parseTuples(s: string): Field[][] {
  const rows: Field[][] = [];
  let row: Field[] = [];
  let field = "";
  let isStr = false;
  let inStr = false;
  let depth = 0;
  const push = () => {
    if (isStr) row.push(field);
    else {
      const t = field.trim();
      row.push(t === "NULL" ? null : t);
    }
    field = "";
    isStr = false;
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\" && i + 1 < s.length) {
        const n = s[i + 1];
        field += n === "n" ? "\n" : n === "r" ? "\r" : n === "t" ? "\t" : n === "0" ? "\0" : n!;
        i++;
      } else if (c === "'") {
        if (s[i + 1] === "'") {
          field += "'";
          i++;
        } else inStr = false;
      } else field += c;
      continue;
    }
    if (c === "'") {
      inStr = true;
      isStr = true;
    } else if (c === "(") {
      if (++depth === 1) {
        row = [];
        field = "";
        isStr = false;
      } else field += c;
    } else if (c === ")") {
      if (--depth === 0) {
        push();
        rows.push(row);
      } else field += c;
    } else if (c === "," && depth === 1) push();
    else if (depth >= 1) field += c;
  }
  return rows;
}

const INSERT_RE = /^INSERT INTO `([a-z0-9_]+)` VALUES /;

/** Stream (table, rows) batches for the requested tables from a .sql.gz. */
export async function* iterInserts(
  dumpPath: string,
  tables: ReadonlySet<string>,
): AsyncGenerator<{ table: string; rows: Field[][] }> {
  const rl = createInterface({
    input: createReadStream(dumpPath).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.startsWith("INSERT INTO")) continue;
    const m = INSERT_RE.exec(line);
    if (!m || !tables.has(m[1]!)) continue;
    const values = line.slice(m[0].length).replace(/;\s*$/, "");
    yield { table: m[1]!, rows: parseTuples(values) };
  }
}
