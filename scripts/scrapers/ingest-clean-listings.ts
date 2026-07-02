// P3 ingestion script.
//
// Reads p0-clean-listings.json + source-quality-report.json and upserts them
// into a local SQLite database (scripts/scrapers/output/akarfinder.db).
//
//   npm run scrape:ingest
//
// Idempotency: a SHA-256 hash of the clean listings file is stored in
// scrape_runs.source_file_hash. Re-running with the same file is a no-op.
//
// To switch to Supabase: see db/supabase-migration.sql and replace openDb()
// with the Supabase JS client using SUPABASE_URL + SUPABASE_SERVICE_KEY.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

import type { ScrapedListingP0, SourceQualityReport } from "./types.js";
import { openDb, hashContent, jsonify, parseJson, DEFAULT_DB_PATH } from "./db/client.js";
import { buildCanonicalFingerprint } from "./utils/fingerprint.js";
import { logger } from "./utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "output");
const CLEAN_PATH = join(OUTPUT_DIR, "p0-clean-listings.json");
const QUALITY_PATH = join(OUTPUT_DIR, "source-quality-report.json");

// Guards — never insert PII even if it slipped through the clean filter.
const PHONE_RE = /(\+212|0[5-7])\d{8}/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export function hasPii(listing: ScrapedListingP0): boolean {
  const text = `${listing.description_snippet ?? ""} ${listing.seller_name ?? ""}`;
  return PHONE_RE.test(text) || EMAIL_RE.test(text);
}

export type IngestStats = {
  totalCleanRead: number;
  insertedRaw: number;
  insertedProperty: number;
  updatedProperty: number;
  insertedSources: number;
  updatedSources: number;
  skipped: number;
  errors: number;
};

export async function ingestCleanListings(opts: {
  cleanPath?: string;
  qualityPath?: string;
  dbPath?: string;
} = {}): Promise<IngestStats> {
  const cleanPath = opts.cleanPath ?? CLEAN_PATH;
  const qualityPath = opts.qualityPath ?? QUALITY_PATH;
  const dbPath = opts.dbPath ?? DEFAULT_DB_PATH;

  const stats: IngestStats = {
    totalCleanRead: 0,
    insertedRaw: 0,
    insertedProperty: 0,
    updatedProperty: 0,
    insertedSources: 0,
    updatedSources: 0,
    skipped: 0,
    errors: 0,
  };

  // 1. Read input files.
  let listings: ScrapedListingP0[];
  let qualityReport: SourceQualityReport | null = null;
  let raw: string;

  try {
    raw = await readFile(cleanPath, "utf8");
    listings = JSON.parse(raw) as ScrapedListingP0[];
    stats.totalCleanRead = listings.length;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(`Cannot read clean listings: ${msg}`);
    stats.errors++;
    return stats;
  }

  try {
    const qr = await readFile(qualityPath, "utf8");
    qualityReport = JSON.parse(qr) as SourceQualityReport;
  } catch {
    // Not fatal — quality report is supplementary.
  }

  const fileHash = hashContent(raw!);

  // 2. Open DB (creates/migrates schema automatically).
  const db = openDb(dbPath);

  try {
    // Check if we've already ingested this exact file.
    const existing = db
      .prepare("SELECT id FROM scrape_runs WHERE source_file_hash = ?")
      .get(fileHash) as { id: number } | undefined;

    if (existing) {
      logger.info(`Already ingested (scrape_run #${existing.id}). Skipping.`);
      stats.skipped = listings.length;
      return stats; // finally block will close the DB
    }

    // 3. Derive source metadata from listings.
    const sourceNames = [...new Set(listings.map((l) => l.source_name))];
    const now = new Date().toISOString();

    // 4. Create scrape_run row.
    const runResult = db.prepare(`
      INSERT INTO scrape_runs
        (started_at, finished_at, source_file, source_file_hash,
         sources_attempted, sources_succeeded,
         total_raw, total_clean, errors_count, quality_report_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      now, null,
      cleanPath, fileHash,
      jsonify(sourceNames), jsonify(sourceNames),
      listings.length, listings.length,
      jsonify(qualityReport),
    );
    const runId = Number(runResult.lastInsertRowid);

    // 5. Prepare statements (defined once, reused in the transaction).
    const insertRaw = db.prepare(`
      INSERT OR IGNORE INTO raw_listings
        (scrape_run_id, source_name, source_url, listing_url, raw_json)
      VALUES (?, ?, ?, ?, ?)
    `);

    const upsertProperty = db.prepare(`
      INSERT INTO property_listings
        (canonical_fingerprint, title, price_mad, city, district,
         property_type, transaction_type, surface_m2,
         rooms_count, bedrooms_count, bathrooms_count,
         description_snippet, images_count, thumbnail_url, seller_name,
         data_completeness_score, field_confidence,
         built_surface_m2, plot_surface_m2, condition, property_age_range,
         orientation, floor_type, floors_count, garden_m2, terrace_m2,
         garage_spaces, has_pool, has_concierge, has_moroccan_living_room,
         has_european_living_room, has_equipped_kitchen, premium_features,
         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(canonical_fingerprint) DO UPDATE SET
        title               = CASE WHEN excluded.data_completeness_score >
                                        property_listings.data_completeness_score
                                   THEN excluded.title
                                   ELSE property_listings.title END,
        price_mad           = COALESCE(excluded.price_mad, property_listings.price_mad),
        city                = COALESCE(excluded.city, property_listings.city),
        district            = COALESCE(excluded.district, property_listings.district),
        surface_m2          = COALESCE(excluded.surface_m2, property_listings.surface_m2),
        rooms_count         = COALESCE(excluded.rooms_count, property_listings.rooms_count),
        bedrooms_count      = COALESCE(excluded.bedrooms_count, property_listings.bedrooms_count),
        bathrooms_count     = COALESCE(excluded.bathrooms_count, property_listings.bathrooms_count),
        description_snippet = CASE WHEN excluded.data_completeness_score >
                                        property_listings.data_completeness_score
                                   THEN excluded.description_snippet
                                   ELSE property_listings.description_snippet END,
        images_count        = COALESCE(excluded.images_count, property_listings.images_count),
        thumbnail_url        = COALESCE(excluded.thumbnail_url, property_listings.thumbnail_url),
        seller_name         = COALESCE(excluded.seller_name, property_listings.seller_name),
        data_completeness_score = MAX(excluded.data_completeness_score,
                                      property_listings.data_completeness_score),
        field_confidence    = CASE WHEN excluded.data_completeness_score >=
                                        property_listings.data_completeness_score
                                   THEN excluded.field_confidence
                                   ELSE property_listings.field_confidence END,
        built_surface_m2        = COALESCE(excluded.built_surface_m2, property_listings.built_surface_m2),
        plot_surface_m2         = COALESCE(excluded.plot_surface_m2, property_listings.plot_surface_m2),
        condition               = COALESCE(excluded.condition, property_listings.condition),
        property_age_range      = COALESCE(excluded.property_age_range, property_listings.property_age_range),
        orientation             = COALESCE(excluded.orientation, property_listings.orientation),
        floor_type              = COALESCE(excluded.floor_type, property_listings.floor_type),
        floors_count            = COALESCE(excluded.floors_count, property_listings.floors_count),
        garden_m2               = COALESCE(excluded.garden_m2, property_listings.garden_m2),
        terrace_m2              = COALESCE(excluded.terrace_m2, property_listings.terrace_m2),
        garage_spaces           = COALESCE(excluded.garage_spaces, property_listings.garage_spaces),
        has_pool                = MAX(excluded.has_pool, property_listings.has_pool),
        has_concierge           = MAX(excluded.has_concierge, property_listings.has_concierge),
        has_moroccan_living_room = MAX(excluded.has_moroccan_living_room, property_listings.has_moroccan_living_room),
        has_european_living_room = MAX(excluded.has_european_living_room, property_listings.has_european_living_room),
        has_equipped_kitchen    = MAX(excluded.has_equipped_kitchen, property_listings.has_equipped_kitchen),
        premium_features        = COALESCE(excluded.premium_features, property_listings.premium_features),
        updated_at              = excluded.updated_at
    `);

    const getPropertyByFingerprint = db.prepare(
      "SELECT id, data_completeness_score FROM property_listings WHERE canonical_fingerprint = ?"
    );

    const upsertSource = db.prepare(`
      INSERT INTO listing_sources
        (property_listing_id, source_name, listing_url, source_url,
         first_seen_at, last_seen_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(listing_url) DO UPDATE SET
        last_seen_at = excluded.last_seen_at,
        is_active    = 1
    `);

    const getSourceByUrl = db.prepare(
      "SELECT id FROM listing_sources WHERE listing_url = ?"
    );

    // 6. Ingest all listings inside a single transaction for performance + atomicity.
    // node:sqlite does not have .transaction() — use explicit BEGIN/COMMIT.
    db.exec("BEGIN");
    try {
      for (const listing of listings) {
        // Hard PII guard.
        if (hasPii(listing)) { stats.skipped++; continue; }
        if (!listing.listing_url || !listing.title || !listing.source_name) {
          stats.skipped++;
          continue;
        }

        try {
          // raw_listings (INSERT OR IGNORE deduplicates within same run).
          const rawResult = insertRaw.run(
            runId,
            listing.source_name,
            listing.source_url ?? null,
            listing.listing_url,
            JSON.stringify(listing),
          );
          if (Number(rawResult.changes) > 0) stats.insertedRaw++;

          // property_listings — detect insert vs update by checking existence before upsert.
          const fingerprint = buildCanonicalFingerprint(listing);
          const before = getPropertyByFingerprint.get(fingerprint) as
            | { id: number; data_completeness_score: number }
            | undefined;

          upsertProperty.run(
            fingerprint,
            listing.title,
            listing.price_mad ?? null,
            listing.city ?? null,
            listing.district ?? null,
            listing.property_type,
            listing.transaction_type,
            listing.surface_m2 ?? null,
            listing.rooms_count ?? null,
            listing.bedrooms_count ?? null,
            listing.bathrooms ?? null,
            listing.description_snippet ?? null,
            listing.images_count ?? null,
            listing.thumbnail_url ?? null,
            listing.seller_name ?? null,
            listing.data_completeness_score,
            jsonify(listing.field_confidence),
            // P8A
            listing.built_surface_m2 ?? null,
            listing.plot_surface_m2 ?? null,
            listing.condition ?? null,
            listing.property_age_range ?? null,
            listing.orientation ?? null,
            listing.floor_type ?? null,
            listing.floors_count ?? null,
            listing.garden_m2 ?? null,
            listing.terrace_m2 ?? null,
            listing.garage_spaces ?? null,
            listing.has_pool ? 1 : 0,
            listing.has_concierge ? 1 : 0,
            listing.has_moroccan_living_room ? 1 : 0,
            listing.has_european_living_room ? 1 : 0,
            listing.has_equipped_kitchen ? 1 : 0,
            listing.premium_features?.length ? jsonify(listing.premium_features) : null,
            now,
            now,
          );

          if (!before) stats.insertedProperty++;
          else stats.updatedProperty++;

          // Retrieve the canonical property id (inserted or pre-existing).
          const propRow = getPropertyByFingerprint.get(fingerprint) as { id: number } | undefined;
          if (!propRow) { stats.errors++; continue; }

          // listing_sources — detect insert vs update.
          const srcBefore = getSourceByUrl.get(listing.listing_url) as { id: number } | undefined;

          upsertSource.run(
            propRow.id,
            listing.source_name,
            listing.listing_url,
            listing.source_url ?? null,
            now,
            now,
          );

          if (srcBefore) stats.updatedSources++;
          else stats.insertedSources++;

        } catch (e) {
          stats.errors++;
        }
      }
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }

    // 7. Update scrape_run with final counts + finished_at.
    db.prepare(`
      UPDATE scrape_runs
      SET finished_at = ?, total_raw = ?, total_clean = ?, errors_count = ?
      WHERE id = ?
    `).run(new Date().toISOString(), stats.insertedRaw, stats.totalCleanRead, stats.errors, runId);

  } finally {
    db.close();
  }

  return stats;
}

async function main() {
  logger.step("AkarFinder — P3 ingestion (clean listings → SQLite)");
  logger.info(`DB  : ${DEFAULT_DB_PATH}`);
  logger.info(`In  : ${CLEAN_PATH}`);

  const stats = await ingestCleanListings();

  logger.step("Ingestion summary");
  console.log(`  Total clean read       : ${stats.totalCleanRead}`);
  console.log(`  Inserted raw_listings  : ${stats.insertedRaw}`);
  console.log(`  Inserted property_listings : ${stats.insertedProperty}`);
  console.log(`  Updated  property_listings : ${stats.updatedProperty}`);
  console.log(`  Inserted listing_sources   : ${stats.insertedSources}`);
  console.log(`  Updated  listing_sources   : ${stats.updatedSources}`);
  console.log(`  Skipped                : ${stats.skipped}`);
  console.log(`  Errors                 : ${stats.errors}`);
  console.log(`  DB file                : ${DEFAULT_DB_PATH}`);

  if (stats.skipped === stats.totalCleanRead && stats.errors === 0 && stats.totalCleanRead > 0) {
    logger.info("Re-run npm run scrape:p0 first to regenerate p0-clean-listings.json.");
  }
}

// Only run as CLI, not when imported as a module (e.g. from tests).
const isCli = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main().catch((e) => {
    logger.error(e instanceof Error ? e.stack ?? e.message : String(e));
    process.exitCode = 1;
  });
}
