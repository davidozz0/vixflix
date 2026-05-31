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
  for (const file of files) {
    const sql = readFileSync(join(drizzleDir, file), "utf-8");
    sqlite.exec(sql);
  }
  console.log(`Migrations applied: ${files.length} file(s) from ${drizzleDir}`);
} else {
  console.log(`No drizzle/ at ${drizzleDir}, skipping migrations`);
}

export const db = drizzle(sqlite, { schema });
