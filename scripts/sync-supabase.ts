#!/usr/bin/env tsx
// Sync local SQLite → Supabase.
// Usage: npm run sync:supabase
//
// What it syncs:
//   1. property_listings — upsert by canonical_fingerprint
//   2. listing_sources   — upsert by listing_url (FK remapped via fingerprint)
//
// Idempotent: safe to run multiple times.
// Does NOT sync scrape_runs / raw_listings (not needed for the UI).

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

// Load .env.local — Next.js does this automatically but standalone scripts don't.
const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = join(__dirname, "scrapers/output/akarfinder.db");
const BATCH_SIZE = 50;

// ─── Env validation ──────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "[sync] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
    "  Copy .env.local.example → .env.local and fill in the values."
  );
  process.exit(1);
}

const DB_PATH = process.env.SQLITE_DB_PATH ?? DEFAULT_DB_PATH;

if (!existsSync(DB_PATH)) {
  console.error(`[sync] SQLite DB not found at: ${DB_PATH}`);
  console.error("  Run: npm run scrape:ingest  to generate it first.");
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJsonField(s: string | null): unknown {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

type BatchFailure = {
  batch: number;
  size: number;
  message: string;
};

type BatchUpsertResult = {
  attempted: number;
  synced: number;
  failed: number;
  failures: BatchFailure[];
};

async function batchUpsert<T extends object>(
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: T[],
  onConflict: string,
  label: string
): Promise<BatchUpsertResult> {
  let synced = 0;
  let failed = 0;
  const failures: BatchFailure[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNumber = i / BATCH_SIZE + 1;
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict });

    if (error) {
      failed += batch.length;
      failures.push({
        batch: batchNumber,
        size: batch.length,
        message: error.message,
      });
      console.warn(`[sync] ${label} batch ${batchNumber} error: ${error.message}`);
    } else {
      synced += batch.length;
      process.stdout.write(`\r[sync] ${label}: ${synced}/${rows.length}`);
    }
  }

  process.stdout.write("\n");
  return {
    attempted: rows.length,
    synced,
    failed,
    failures,
  };
}

function printBatchSummary(label: string, result: BatchUpsertResult) {
  console.log(
    `[sync] ${label} summary — attempted: ${result.attempted}, synced: ${result.synced}, failed: ${result.failed}`
  );

  for (const failure of result.failures) {
    console.error(
      `[sync] ${label} failed batch ${failure.batch} (${failure.size} rows): ${failure.message}`
    );
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const db = new DatabaseSync(DB_PATH, { readOnly: true });

  console.log(`[sync] SQLite: ${DB_PATH}`);
  console.log(`[sync] Supabase: ${SUPABASE_URL}`);

  // ── 1. Sync property_listings ──────────────────────────────────────────────

  type SqliteListing = {
    id: number;
    canonical_fingerprint: string;
    title: string | null;
    price_mad: number | null;
    city: string | null;
    district: string | null;
    property_type: string | null;
    transaction_type: string | null;
    surface_m2: number | null;
    rooms_count: number | null;
    bedrooms_count: number | null;
    bathrooms_count: number | null;
    description_snippet: string | null;
    images_count: number | null;
    thumbnail_url: string | null;
    seller_name: string | null;
    data_completeness_score: number;
    field_confidence: string | null;
    created_at: string;
    updated_at: string;
    duplicate_group_id: string | null;
    duplicate_score: number | null;
    reliability_score: number | null;
    reliability_badge: string | null;
    reliability_reasons: string | null;
    // P8A
    built_surface_m2: number | null;
    plot_surface_m2: number | null;
    condition: string | null;
    property_age_range: string | null;
    orientation: string | null;
    floor_type: string | null;
    floors_count: number | null;
    garden_m2: number | null;
    terrace_m2: number | null;
    garage_spaces: number | null;
    has_pool: number;
    has_concierge: number;
    has_moroccan_living_room: number;
    has_european_living_room: number;
    has_equipped_kitchen: number;
    premium_features: string | null;
  };

  const sqliteListings = db
    .prepare(
      `SELECT id, canonical_fingerprint, title, price_mad, city, district,
              property_type, transaction_type, surface_m2, rooms_count,
              bedrooms_count, bathrooms_count, description_snippet, images_count,
              thumbnail_url,
              seller_name, data_completeness_score, field_confidence,
              created_at, updated_at,
              duplicate_group_id, duplicate_score, reliability_score,
              reliability_badge, reliability_reasons,
              built_surface_m2, plot_surface_m2, condition, property_age_range,
              orientation, floor_type, floors_count, garden_m2, terrace_m2,
              garage_spaces, has_pool, has_concierge, has_moroccan_living_room,
              has_european_living_room, has_equipped_kitchen, premium_features
       FROM property_listings
       ORDER BY id`
    )
    .all() as SqliteListing[];

  // Build SQLite id → fingerprint map for FK remapping below.
  const sqliteIdToFingerprint = new Map<number, string>(
    sqliteListings.map((r) => [r.id, r.canonical_fingerprint])
  );

  // Convert TEXT JSON / INTEGER boolean fields for Supabase JSONB / BOOLEAN columns.
  const supabaseListings = sqliteListings.map(({ id: _id, ...row }) => ({
    ...row,
    field_confidence: parseJsonField(row.field_confidence),
    reliability_reasons: parseJsonField(row.reliability_reasons),
    premium_features: parseJsonField(row.premium_features),
    // SQLite INTEGER 0/1 → BOOLEAN for Supabase
    has_pool: row.has_pool === 1,
    has_concierge: row.has_concierge === 1,
    has_moroccan_living_room: row.has_moroccan_living_room === 1,
    has_european_living_room: row.has_european_living_room === 1,
    has_equipped_kitchen: row.has_equipped_kitchen === 1,
  }));

  console.log(`\n[sync] property_listings: ${supabaseListings.length} rows`);
  const propertySync = await batchUpsert(
    supabase,
    "property_listings",
    supabaseListings,
    "canonical_fingerprint",
    "property_listings"
  );
  printBatchSummary("property_listings", propertySync);
  if (propertySync.failed > 0) {
    db.close();
    console.error("[sync] property_listings sync failed — aborting before listing_sources.");
    process.exit(1);
  }

  // ── 2. Fetch Supabase IDs for FK remapping ─────────────────────────────────

  const { data: sbListings, error: fetchErr } = await supabase
    .from("property_listings")
    .select("id, canonical_fingerprint")
    .limit(10000);

  if (fetchErr || !sbListings) {
    console.error("[sync] Failed to fetch Supabase IDs:", fetchErr?.message);
    db.close();
    process.exit(1);
  }

  const fingerprintToSupabaseId = new Map<string, number>(
    sbListings.map((r: { id: number; canonical_fingerprint: string }) => [
      r.canonical_fingerprint,
      r.id,
    ])
  );

  // ── 3. Sync listing_sources ────────────────────────────────────────────────

  type SqliteSource = {
    id: number;
    property_listing_id: number;
    source_name: string;
    listing_url: string;
    source_url: string | null;
    first_seen_at: string;
    last_seen_at: string;
    is_active: number;
  };

  const sqliteSources = db
    .prepare(
      `SELECT id, property_listing_id, source_name, listing_url, source_url,
              first_seen_at, last_seen_at, is_active
       FROM listing_sources
       ORDER BY id`
    )
    .all() as SqliteSource[];

  const supabaseSources = sqliteSources
    .map(({ id: _id, property_listing_id, is_active, ...row }) => {
      const fingerprint = sqliteIdToFingerprint.get(property_listing_id);
      if (!fingerprint) return null;
      const supabasePropertyId = fingerprintToSupabaseId.get(fingerprint);
      if (!supabasePropertyId) return null;
      return {
        ...row,
        property_listing_id: supabasePropertyId,
        is_active: is_active === 1, // INTEGER → BOOLEAN
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  console.log(`[sync] listing_sources: ${supabaseSources.length} rows`);
  const sourcesSync = await batchUpsert(
    supabase,
    "listing_sources",
    supabaseSources,
    "listing_url",
    "listing_sources"
  );
  printBatchSummary("listing_sources", sourcesSync);
  if (sourcesSync.failed > 0) {
    db.close();
    console.error("[sync] listing_sources sync failed.");
    process.exit(1);
  }

  db.close();
  console.log("\n[sync] Done.");
}

main().catch((err) => {
  console.error("[sync] Fatal:", err);
  process.exit(1);
});
