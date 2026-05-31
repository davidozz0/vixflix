import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "./schema.js";

const dbPath = process.env.DATABASE_URL || "./sqlite.db";
const sqlite = new Database(dbPath);
sqlite.exec("PRAGMA journal_mode = WAL;");

export const db = drizzle(sqlite, { schema });

try {
  migrate(db, { migrationsFolder: "./drizzle" });
} catch (_) {
  // migrations already applied or folder missing in dev
}
