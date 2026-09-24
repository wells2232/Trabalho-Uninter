import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate as runMigrations } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.js";

export function openDatabase(
  path = process.env.DATABASE_PATH || "./data/raizes.sqlite",
) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const client = new Database(path);
  client.pragma("foreign_keys = ON");
  client.pragma("journal_mode = WAL");
  client.pragma("busy_timeout = 5000");
  const db = drizzle(client, { schema });
  db.close = () => client.close();
  return db;
}
export function migrate(db) {
  runMigrations(db, {
    migrationsFolder: fileURLToPath(
      new URL("../../migrations", import.meta.url),
    ),
  });
}
