import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema.js";

const dbPath = process.env.DATABASE_URL || "./sqlite.db";
const sqlite = new Database(dbPath);
sqlite.exec("PRAGMA journal_mode = WAL;");

const __dirname = dirname(fileURLToPath(import.meta.url));
const drizzleDir = join(__dirname, "..", "..", "drizzle");
if (existsSync(drizzleDir)) {
  const files = readdirSync(drizzleDir).filter(f => f.endsWith(".sql")).sort();
  let applied = 0;
  for (const file of files) {
    const sql = readFileSync(join(drizzleDir, file), "utf-8");
    let changed = false;
    for (const stmt of sql.split("--> statement-breakpoint")) {
      try { sqlite.exec(stmt); changed = true; } catch (_) { /* already applied */ }
    }
    if (changed) applied++;
  }
  if (applied > 0) console.log(`Migrations applied: ${applied} file(s) from ${drizzleDir}`);
}

export const db = drizzle(sqlite, { schema });
