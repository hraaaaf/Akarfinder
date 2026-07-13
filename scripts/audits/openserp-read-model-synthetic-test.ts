import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { queryDbListings } from "@/lib/listings/db-listings";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import {
  canPublishDbRowToPublicSurface,
  canPublishListingToPublicSurface,
} from "@/lib/listings/public-listing-access";

const OUTPUT_PATH = resolve(
  process.cwd(),
  "data/audits/openserp_read_model_synthetic_test_1.json",
);

function createSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE property_listings (
      id INTEGER PRIMARY KEY,
      canonical_fingerprint TEXT NOT NULL,
      title TEXT,
      price_mad INTEGER,
      city TEXT,
      district TEXT,
      property_type TEXT,
      transaction_type TEXT,
      surface_m2 INTEGER,
      rooms_count INTEGER,
      bedrooms_count INTEGER,
      bathrooms_count INTEGER,
      description_snippet TEXT,
      images_count INTEGER,
      thumbnail_url TEXT,
      seller_name TEXT,
      data_completeness_score INTEGER NOT NULL,
      field_confidence TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      duplicate_group_id TEXT,
      duplicate_score REAL,
      reliability_score REAL,
      reliability_badge TEXT,
      reliability_reasons TEXT,
      built_surface_m2 INTEGER,
      plot_surface_m2 INTEGER,
      condition TEXT,
      property_age_range TEXT,
      orientation TEXT,
      floor_type TEXT,
      floors_count INTEGER,
      garden_m2 INTEGER,
      terrace_m2 INTEGER,
      garage_spaces INTEGER,
      has_pool INTEGER,
      has_concierge INTEGER,
      has_moroccan_living_room INTEGER,
      has_european_living_room INTEGER,
      has_equipped_kitchen INTEGER,
      premium_features TEXT
    );

    CREATE TABLE listing_sources (
      id INTEGER PRIMARY KEY,
      property_listing_id INTEGER NOT NULL,
      source_name TEXT NOT NULL,
      listing_url TEXT NOT NULL,
      source_url TEXT,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      is_active INTEGER NOT NULL
    );
  `);
}

function seedFixture(db: DatabaseSync) {
  db.prepare(`
    INSERT INTO property_listings (
      id, canonical_fingerprint, title, price_mad, city, district, property_type,
      transaction_type, surface_m2, bedrooms_count, description_snippet,
      data_completeness_score, field_confidence, created_at, updated_at,
      reliability_score, reliability_badge, reliability_reasons
    ) VALUES (
      1, 'openserp-fixture', 'Appartement externe OpenSERP', 1850000, 'Casablanca', 'Maarif', 'apartment',
      'sale', 92, 2, 'Fixture locale pour test du read-model',
      78, '{"provider":"openserp"}', '2026-07-13T00:00:00.000Z', '2026-07-13T00:00:00.000Z',
      82, 'high', '[]'
    )
  `).run();

  db.prepare(`
    INSERT INTO listing_sources (
      id, property_listing_id, source_name, listing_url, source_url, first_seen_at, last_seen_at, is_active
    ) VALUES (
      1, 1, 'agenz', 'https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/maarif/123456',
      'https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/maarif/123456',
      '2026-07-13T00:00:00.000Z', '2026-07-13T00:00:00.000Z', 1
    )
  `).run();
}

async function main() {
  const tempRoot = join(tmpdir(), `akarfinder-openserp-read-model-${Date.now()}`);
  await mkdir(tempRoot, { recursive: true });
  const dbPath = join(tempRoot, "synthetic-akarfinder.db");
  const db = new DatabaseSync(dbPath);

  try {
    createSchema(db);
    seedFixture(db);

    const result = queryDbListings({}, dbPath);
    const row = result.listings[0] ?? null;
    const mapped = row ? mapDbRowToListing(row) : null;

    const report = {
      synthetic_db_path: dbPath,
      query_returned_rows: result.listings.length,
      db_row_found: row != null,
      raw_source_name: row?.source_name ?? null,
      raw_publishable: row ? canPublishDbRowToPublicSurface(row) : null,
      mapped_publishable: mapped ? canPublishListingToPublicSurface(mapped) : null,
      blocking_file: "lib/listings/public-listing-access.ts",
      blocking_function: "canPublishDbRowToPublicSurface",
      blocking_condition: "canPublishStructuredListing(row.source_name ?? '')",
      required_source_kind: "first_party|partner_authorized",
      openserp_source_name_example: "agenz",
      expected_search_visibility_with_current_code: false,
    };

    await mkdir(dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    db.close();
    await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
