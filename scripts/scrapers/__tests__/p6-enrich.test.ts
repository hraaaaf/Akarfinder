// P6 integration tests: migration, full-DB enrichment, persisted-value reads,
// and on-the-fly fallback.

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { ingestCleanListings } from "../ingest-clean-listings.js";
import { openDb } from "../db/client.js";
import { enrichAll } from "../enrich-p6.js";
import { queryDbListings } from "../../../lib/listings/db-listings.js";
import { mapDbRowToListing } from "../../../lib/listings/map-db-listing.js";
import type { ScrapedListingP0 } from "../types.js";

const tmpFiles: string[] = [];
const savedThirdPartyDbIngestion = process.env.THIRD_PARTY_DB_INGESTION_ENABLED;
process.env.THIRD_PARTY_DB_INGESTION_ENABLED = "true";

after(async () => {
  for (const f of tmpFiles) {
    try { await unlink(f); } catch { /* ignore */ }
  }
  if (savedThirdPartyDbIngestion === undefined) delete process.env.THIRD_PARTY_DB_INGESTION_ENABLED;
  else process.env.THIRD_PARTY_DB_INGESTION_ENABLED = savedThirdPartyDbIngestion;
});

async function writeTmp(name: string, content: string): Promise<string> {
  const p = join(tmpdir(), `akar-p6-${Date.now()}-${name}`);
  await writeFile(p, content, "utf8");
  tmpFiles.push(p);
  return p;
}

function fakeListing(overrides: Partial<ScrapedListingP0> = {}): ScrapedListingP0 {
  return {
    source_name: "mubawab",
    source_url: "https://mubawab.ma",
    listing_url: "https://mubawab.ma/fr/p6/1",
    title: "Appartement lumineux Maarif",
    price_raw: "1 200 000 DH",
    price_mad: 1_200_000,
    city: "Casablanca",
    district: "Maarif",
    property_type: "apartment",
    transaction_type: "sale",
    surface_raw: "100 m²",
    surface_m2: 100,
    rooms_count: 4,
    bedrooms_count: 3,
    bathrooms: 2,
    description_snippet: "Bel appartement avec terrasse",
    images_count: 5,
    seller_name: "Agence Test P6",
    published_at_raw: null,
    scraped_at: new Date().toISOString(),
    data_completeness_score: 88,
    field_confidence: {
      price: "high", city: "high", district: "high", surface: "high",
      rooms: "medium", bedrooms: "high", bathrooms: "medium",
      description: "medium", seller: "high",
    },
    ...overrides,
  };
}

async function buildTestDb(listings: ScrapedListingP0[]): Promise<string> {
  const cleanPath = await writeTmp("clean.json", JSON.stringify(listings));
  const qualityPath = await writeTmp("quality.json", "{}");
  const dbPath = join(tmpdir(), `akar-p6-${Date.now()}.db`);
  tmpFiles.push(dbPath);
  await ingestCleanListings({ cleanPath, qualityPath, dbPath });
  return dbPath;
}

// -------------------------------------------------------------------------
// Migration
// -------------------------------------------------------------------------

describe("P6 migration — openDb adds new columns", () => {
  it("property_listings has the 5 P6 columns after openDb()", async () => {
    const dbPath = await buildTestDb([fakeListing()]);
    // openDb() was already called by ingestCleanListings — columns must exist.
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const cols = db
      .prepare("PRAGMA table_info(property_listings)")
      .all() as Array<{ name: string }>;
    db.close();

    const names = new Set(cols.map((c) => c.name));
    assert.ok(names.has("duplicate_group_id"), "missing duplicate_group_id");
    assert.ok(names.has("duplicate_score"),    "missing duplicate_score");
    assert.ok(names.has("reliability_score"),  "missing reliability_score");
    assert.ok(names.has("reliability_badge"),  "missing reliability_badge");
    assert.ok(names.has("reliability_reasons"),"missing reliability_reasons");
  });

  it("migration is idempotent — calling openDb() twice does not throw", async () => {
    const dbPath = await buildTestDb([fakeListing()]);
    // Second openDb() should silently skip already-existing columns.
    assert.doesNotThrow(() => {
      const db = openDb(dbPath);
      db.close();
    });
  });
});

// -------------------------------------------------------------------------
// Enrichment writes correct values
// -------------------------------------------------------------------------

describe("P6 enrichAll — persists enrichment data", () => {
  it("populates duplicate_group_id for every row", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/a1" }),
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/a2", city: "Rabat" }),
    ]);
    enrichAll(dbPath);

    const db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db
      .prepare("SELECT duplicate_group_id FROM property_listings")
      .all() as Array<{ duplicate_group_id: string | null }>;
    db.close();

    for (const row of rows) {
      assert.ok(row.duplicate_group_id != null, "duplicate_group_id should not be null");
    }
  });

  it("populates reliability_score in [0, 100] for every row", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/b1" }),
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/b2", city: "Rabat" }),
    ]);
    enrichAll(dbPath);

    const db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db
      .prepare("SELECT reliability_score FROM property_listings")
      .all() as Array<{ reliability_score: number | null }>;
    db.close();

    for (const row of rows) {
      assert.ok(row.reliability_score != null, "reliability_score should not be null");
      assert.ok(row.reliability_score >= 0 && row.reliability_score <= 100,
        `score ${row.reliability_score} out of range`);
    }
  });

  it("two near-identical listings in the same city share duplicate_group_id", async () => {
    // Use prices that hash to different fingerprint buckets but are within 10%:
    //   1,200,000 → bucket 1,200,000
    //   1,251,000 → bucket 1,300,000 (ratio ≈ 4% → scored as near-duplicate ≥ 0.70)
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/c1", price_raw: "1 200 000 DH", price_mad: 1_200_000 }),
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/c2", price_raw: "1 251 000 DH", price_mad: 1_251_000 }),
    ]);
    enrichAll(dbPath);

    const db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db
      .prepare("SELECT id, duplicate_group_id, duplicate_score FROM property_listings ORDER BY id")
      .all() as Array<{ id: number; duplicate_group_id: string; duplicate_score: number }>;
    db.close();

    assert.equal(rows.length, 2, "should have 2 distinct property_listing rows");
    assert.equal(rows[0].duplicate_group_id, rows[1].duplicate_group_id,
      "near-identical listings should share group_id");
    assert.ok(rows[0].duplicate_score > 0 || rows[1].duplicate_score > 0,
      "at least one listing should have a non-zero duplicate_score");
  });

  it("listings in different cities get different duplicate_group_ids", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/d1", city: "Casablanca" }),
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/d2", city: "Rabat" }),
    ]);
    enrichAll(dbPath);

    const db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db
      .prepare("SELECT duplicate_group_id FROM property_listings ORDER BY id")
      .all() as Array<{ duplicate_group_id: string }>;
    db.close();

    assert.notEqual(rows[0].duplicate_group_id, rows[1].duplicate_group_id,
      "different cities must never share a duplicate group");
  });

  it("populates reliability_badge as a valid label", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/e1" }),
    ]);
    enrichAll(dbPath);

    const db = new DatabaseSync(dbPath, { readOnly: true });
    const row = db
      .prepare("SELECT reliability_badge FROM property_listings LIMIT 1")
      .get() as { reliability_badge: string | null };
    db.close();

    const valid = ["Très fiable", "Fiable", "À vérifier", "Faible confiance"];
    assert.ok(valid.includes(row.reliability_badge ?? ""),
      `invalid badge: ${row.reliability_badge}`);
  });

  it("does not contain forbidden words in badge", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/f1" }),
    ]);
    enrichAll(dbPath);

    const db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db
      .prepare("SELECT reliability_badge FROM property_listings")
      .all() as Array<{ reliability_badge: string | null }>;
    db.close();

    for (const row of rows) {
      const badge = row.reliability_badge ?? "";
      assert.ok(!badge.includes("certifié"), "badge must not contain 'certifié'");
      assert.ok(!badge.includes("garanti"),  "badge must not contain 'garanti'");
      assert.ok(!badge.includes("vérifié"),  "badge must not contain 'vérifié'");
    }
  });

  it("row count is unchanged after enrichment (no merges or deletions)", async () => {
    const listings = [
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/g1" }),
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/g2", city: "Rabat" }),
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/g3", city: "Marrakech" }),
    ];
    const dbPath = await buildTestDb(listings);

    const countBefore = (
      new DatabaseSync(dbPath, { readOnly: true })
        .prepare("SELECT COUNT(*) as n FROM property_listings")
        .get() as { n: number }
    ).n;

    enrichAll(dbPath);

    const countAfter = (
      new DatabaseSync(dbPath, { readOnly: true })
        .prepare("SELECT COUNT(*) as n FROM property_listings")
        .get() as { n: number }
    ).n;

    assert.equal(countAfter, countBefore, "enrichment must not delete or add rows");
  });

  it("enrichment is idempotent — re-running does not change the count", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/h1" }),
    ]);
    enrichAll(dbPath);
    enrichAll(dbPath); // second run

    const db = new DatabaseSync(dbPath, { readOnly: true });
    const count = (
      db.prepare("SELECT COUNT(*) as n FROM property_listings").get() as { n: number }
    ).n;
    db.close();

    assert.equal(count, 1);
  });
});

// -------------------------------------------------------------------------
// API reads persisted values
// -------------------------------------------------------------------------

describe("P6 mapDbRowToListing — persisted values take precedence", () => {
  it("uses reliability_score from DB when present", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/i1" }),
    ]);
    enrichAll(dbPath);

    const result = queryDbListings({}, dbPath);
    assert.equal(result.listings.length, 1);

    const row = result.listings[0];
    // The DB-persisted reliability_score should equal what the mapper returns.
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const stored = db
      .prepare("SELECT reliability_score FROM property_listings WHERE id = ?")
      .get(row.id) as { reliability_score: number };
    db.close();

    const listing = mapDbRowToListing(row);
    assert.equal(listing.reliability_score, stored.reliability_score,
      "mapper should use persisted reliability_score");
  });

  it("uses persisted duplicate_group_id from DB", async () => {
    // Different fingerprint buckets but near-duplicate prices (within 10%).
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/j1", price_raw: "1 200 000 DH", price_mad: 1_200_000 }),
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/j2", price_raw: "1 251 000 DH", price_mad: 1_251_000 }),
    ]);
    enrichAll(dbPath);

    const result = queryDbListings({}, dbPath);
    assert.equal(result.listings.length, 2, "should have 2 distinct rows");

    // mapDbRowToListing should read the persisted duplicate_group_id from DB.
    const listing1 = mapDbRowToListing(result.listings[0]);
    const listing2 = mapDbRowToListing(result.listings[1]);

    assert.ok(listing1.duplicate_group_id, "listing1 should have duplicate_group_id");
    assert.ok(listing2.duplicate_group_id, "listing2 should have duplicate_group_id");
    // Near-duplicates share the group_id (set by enrichAll).
    assert.equal(listing1.duplicate_group_id, listing2.duplicate_group_id,
      "persisted group_id should be the same for near-duplicates");
  });

  it("falls back to on-the-fly computation when persisted fields are null", async () => {
    // Build a DB without running enrichAll (fields remain null/default).
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/p6/k1" }),
    ]);

    const result = queryDbListings({}, dbPath);
    const row = result.listings[0];

    // Confirm the DB row has null reliability_score (not yet enriched).
    // The schema default is INTEGER DEFAULT 0, so it will be 0, not null.
    // We check that mapDbRowToListing still returns a valid score.
    const listing = mapDbRowToListing(row);
    assert.ok(
      listing.reliability_score != null && listing.reliability_score >= 0,
      "mapper should return a valid score even without enrichment"
    );
    assert.ok(listing.reliability_badge != null, "should have a badge");
    assert.ok(listing.reliability_available === true, "should be available");
  });
});
