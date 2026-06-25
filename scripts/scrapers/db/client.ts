// SQLite client using the built-in node:sqlite module (Node.js >= 22.5.0).
// No native compilation required — pure WASM built into Node.js.
//
// To migrate to Supabase:
//   1. Run db/supabase-migration.sql against your project.
//   2. Replace openDb() callers with the Supabase JS client.
//   3. Map the SQL statements below to Supabase RPC / raw SQL.

// node:sqlite is experimental in Node.js 22-24 — suppress the warning.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "schema.sql");

export const DEFAULT_DB_PATH = join(__dirname, "../output/akarfinder.db");

// P6 + P8A columns added to property_listings — applied once via ALTER TABLE.
// Each entry is idempotent: the column is skipped if it already exists.
const P6_COLUMNS: Array<{ name: string; def: string }> = [
  { name: "duplicate_group_id",      def: "TEXT" },
  { name: "duplicate_score",         def: "REAL" },
  { name: "reliability_score",       def: "INTEGER" },
  { name: "reliability_badge",       def: "TEXT" },
  { name: "reliability_reasons",     def: "TEXT" },
  // P8A: advanced property characteristics
  { name: "built_surface_m2",        def: "INTEGER" },
  { name: "plot_surface_m2",         def: "INTEGER" },
  { name: "condition",               def: "TEXT" },
  { name: "property_age_range",      def: "TEXT" },
  { name: "orientation",             def: "TEXT" },
  { name: "floor_type",              def: "TEXT" },
  { name: "floors_count",            def: "INTEGER" },
  { name: "garden_m2",               def: "INTEGER" },
  { name: "terrace_m2",              def: "INTEGER" },
  { name: "garage_spaces",           def: "INTEGER" },
  { name: "has_pool",                def: "INTEGER DEFAULT 0" },
  { name: "has_concierge",           def: "INTEGER DEFAULT 0" },
  { name: "has_moroccan_living_room", def: "INTEGER DEFAULT 0" },
  { name: "has_european_living_room", def: "INTEGER DEFAULT 0" },
  { name: "has_equipped_kitchen",    def: "INTEGER DEFAULT 0" },
  { name: "premium_features",        def: "TEXT" },
];

function runMigrations(db: DatabaseSync): void {
  const existing = db
    .prepare("PRAGMA table_info(property_listings)")
    .all() as Array<{ name: string }>;
  const existingNames = new Set(existing.map((r) => r.name));
  for (const col of P6_COLUMNS) {
    if (!existingNames.has(col.name)) {
      db.exec(
        `ALTER TABLE property_listings ADD COLUMN ${col.name} ${col.def}`
      );
    }
  }
}

export function openDb(dbPath = DEFAULT_DB_PATH): DatabaseSync {
  const db = new DatabaseSync(dbPath);
  // WAL mode for concurrent read/write performance.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  // Apply schema (CREATE TABLE IF NOT EXISTS — idempotent).
  const schema = readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);
  // Apply incremental migrations (idempotent — skips existing columns).
  runMigrations(db);
  return db;
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 32);
}

// Helpers that map SQL columns to/from JS values.
export function jsonify(v: unknown): string | null {
  if (v == null) return null;
  return JSON.stringify(v);
}

export function parseJson<T>(s: string | null): T | null {
  if (s == null) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}
