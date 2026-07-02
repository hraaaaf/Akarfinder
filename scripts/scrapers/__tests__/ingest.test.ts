// Integration tests: ingestCleanListings against an in-memory SQLite DB.
// Each test uses a fresh temp DB file to guarantee isolation.

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { ingestCleanListings } from "../ingest-clean-listings.js";
import { openDb, parseJson } from "../db/client.js";
import { buildCanonicalFingerprint } from "../utils/fingerprint.js";
import type { ScrapedListingP0, FieldConfidence } from "../types.js";

// Temp files created during tests — cleaned up in after().
const tmpFiles: string[] = [];
const savedThirdPartyDbIngestion = process.env.THIRD_PARTY_DB_INGESTION_ENABLED;
process.env.THIRD_PARTY_DB_INGESTION_ENABLED = "true";

async function writeTmp(name: string, content: string): Promise<string> {
  const p = join(tmpdir(), `akar-test-${Date.now()}-${name}`);
  await writeFile(p, content, "utf8");
  tmpFiles.push(p);
  return p;
}

after(async () => {
  for (const f of tmpFiles) {
    try { await unlink(f); } catch { /* ignore */ }
  }
  if (savedThirdPartyDbIngestion === undefined) delete process.env.THIRD_PARTY_DB_INGESTION_ENABLED;
  else process.env.THIRD_PARTY_DB_INGESTION_ENABLED = savedThirdPartyDbIngestion;
});

function fakeListing(overrides: Partial<ScrapedListingP0> = {}): ScrapedListingP0 {
  return {
    source_name: "mubawab",
    source_url: "https://mubawab.ma",
    listing_url: "https://mubawab.ma/fr/a/100",
    title: "Appartement test",
    price_raw: "600 000 DH",
    price_mad: 600_000,
    city: "Casablanca",
    district: null,
    property_type: "apartment",
    transaction_type: "sale",
    surface_raw: "80 m²",
    surface_m2: 80,
    rooms_count: null,
    bedrooms_count: 2,
    bathrooms: 1,
    description_snippet: "Bel appartement lumineux",
    images_count: 4,
    seller_name: "Agence Immobilière Test",
    published_at_raw: null,
    scraped_at: new Date().toISOString(),
    data_completeness_score: 88,
    field_confidence: {
      price: "high", city: "high", district: "missing", surface: "high",
      rooms: "missing", bedrooms: "medium", bathrooms: "medium",
      description: "medium", seller: "high",
    },
    ...overrides,
  };
}

async function runIngest(listings: ScrapedListingP0[], quality = {}): Promise<{
  stats: Awaited<ReturnType<typeof ingestCleanListings>>;
  db: DatabaseSync;
  dbPath: string;
}> {
  const cleanPath = await writeTmp("clean.json", JSON.stringify(listings));
  const qualityPath = await writeTmp("quality.json", JSON.stringify(quality));
  const dbPath = join(tmpdir(), `akar-test-${Date.now()}.db`);
  tmpFiles.push(dbPath);

  const stats = await ingestCleanListings({ cleanPath, qualityPath, dbPath });
  const db = openDb(dbPath);
  return { stats, db, dbPath };
}

describe("ingestCleanListings — basic ingestion", () => {
  it("inserts one listing and creates all 4 rows", async () => {
    const { stats, db } = await runIngest([fakeListing()]);

    assert.equal(stats.totalCleanRead, 1);
    assert.equal(stats.insertedRaw, 1);
    assert.equal(stats.insertedProperty, 1);
    assert.equal(stats.insertedSources, 1);
    assert.equal(stats.errors, 0);

    const run = db.prepare("SELECT * FROM scrape_runs").get() as any;
    assert.ok(run.id > 0, "scrape_run created");
    assert.ok(run.source_file_hash, "hash stored");

    const prop = db.prepare("SELECT * FROM property_listings").get() as any;
    assert.ok(prop.canonical_fingerprint, "fingerprint present");
    assert.equal(prop.city, "Casablanca");
    assert.equal(prop.price_mad, 600_000);

    const src = db.prepare("SELECT * FROM listing_sources").get() as any;
    assert.equal(src.listing_url, "https://mubawab.ma/fr/a/100");
    assert.equal(src.is_active, 1);

    db.close();
  });

  it("preserves field_confidence and data_completeness_score", async () => {
    const listing = fakeListing();
    const { db } = await runIngest([listing]);

    const prop = db.prepare("SELECT field_confidence, data_completeness_score FROM property_listings").get() as any;
    assert.equal(prop.data_completeness_score, 88);

    const conf = parseJson<FieldConfidence>(prop.field_confidence);
    assert.ok(conf, "field_confidence is not null");
    assert.equal(conf!.price, "high");
    assert.equal(conf!.city, "high");
    assert.equal(conf!.district, "missing");

    db.close();
  });
});

describe("ingestCleanListings — idempotency", () => {
  it("second run with same file is a no-op", async () => {
    const cleanPath = await writeTmp("clean.json", JSON.stringify([fakeListing()]));
    const qualityPath = await writeTmp("quality.json", "{}");
    const dbPath = join(tmpdir(), `akar-test-${Date.now()}.db`);
    tmpFiles.push(dbPath);

    const s1 = await ingestCleanListings({ cleanPath, qualityPath, dbPath });
    const s2 = await ingestCleanListings({ cleanPath, qualityPath, dbPath });

    assert.equal(s1.insertedProperty, 1, "first run inserts");
    // Second run: file hash already in scrape_runs → skipped
    assert.equal(s2.skipped, 1, "second run skips all (same file hash)");
    assert.equal(s2.insertedProperty, 0, "no new property inserted on re-run");

    // Only one scrape_run record.
    const db = openDb(dbPath);
    const runCount = (db.prepare("SELECT COUNT(*) as c FROM scrape_runs").get() as any).c;
    assert.equal(runCount, 1, "only one scrape_run record exists");
    db.close();
  });

  it("two different listings produce two distinct property_listings", async () => {
    const listings = [
      fakeListing({ listing_url: "https://mubawab.ma/fr/a/1", city: "Casablanca", price_mad: 600_000 }),
      fakeListing({ listing_url: "https://mubawab.ma/fr/a/2", city: "Rabat", price_mad: 800_000 }),
    ];
    const { stats, db } = await runIngest(listings);

    assert.equal(stats.insertedProperty, 2);
    const count = (db.prepare("SELECT COUNT(*) as c FROM property_listings").get() as any).c;
    assert.equal(count, 2);
    db.close();
  });

  it("two listings with same fingerprint → one property, two sources", async () => {
    const l1 = fakeListing({ listing_url: "https://mubawab.ma/fr/a/10", source_name: "mubawab" });
    const l2 = {
      ...l1,
      listing_url: "https://avito.ma/fr/listing/10",
      source_name: "avito" as const,
    };
    const fp1 = buildCanonicalFingerprint(l1);
    const fp2 = buildCanonicalFingerprint(l2);
    assert.equal(fp1, fp2, "both listings should have the same fingerprint");

    const { stats, db } = await runIngest([l1, l2]);

    assert.equal(stats.insertedProperty, 1, "only one canonical property");
    assert.equal(stats.updatedProperty, 1, "second listing updates the property");
    assert.equal(stats.insertedSources, 2, "two distinct source URLs");

    const propCount = (db.prepare("SELECT COUNT(*) as c FROM property_listings").get() as any).c;
    assert.equal(propCount, 1);

    const srcCount = (db.prepare("SELECT COUNT(*) as c FROM listing_sources").get() as any).c;
    assert.equal(srcCount, 2);
    db.close();
  });
});

describe("ingestCleanListings — listing_url uniqueness", () => {
  it("same listing_url in two ingest runs updates last_seen_at, not duplicates", async () => {
    const cleanPath1 = await writeTmp("clean1.json", JSON.stringify([fakeListing()]));
    const cleanPath2 = await writeTmp("clean2.json", JSON.stringify([
      fakeListing({ title: "Updated title", data_completeness_score: 100 }),
    ]));
    const qualityPath = await writeTmp("quality.json", "{}");
    const dbPath = join(tmpdir(), `akar-test-${Date.now()}.db`);
    tmpFiles.push(dbPath);

    await ingestCleanListings({ cleanPath: cleanPath1, qualityPath, dbPath });
    await ingestCleanListings({ cleanPath: cleanPath2, qualityPath, dbPath });

    const db = openDb(dbPath);
    const srcCount = (db.prepare("SELECT COUNT(*) as c FROM listing_sources").get() as any).c;
    assert.equal(srcCount, 1, "only one source row despite two runs");

    // Better completeness score should win.
    const prop = db.prepare("SELECT data_completeness_score FROM property_listings").get() as any;
    assert.equal(prop.data_completeness_score, 100, "higher completeness wins on update");
    db.close();
  });
});

describe("ingestCleanListings — PII guard", () => {
  it("listing with phone number in description is skipped", async () => {
    const listing = fakeListing({
      description_snippet: "Contactez nous au 0612345678 pour visiter",
    });
    const { stats, db } = await runIngest([listing]);

    assert.equal(stats.skipped, 1);
    assert.equal(stats.insertedRaw, 0);
    assert.equal(stats.insertedProperty, 0);

    const count = (db.prepare("SELECT COUNT(*) as c FROM property_listings").get() as any).c;
    assert.equal(count, 0);
    db.close();
  });

  it("listing with email in seller_name is skipped", async () => {
    const listing = fakeListing({ seller_name: "contact@agence.ma" });
    const { stats, db } = await runIngest([listing]);

    assert.equal(stats.skipped, 1);
    assert.equal(stats.insertedProperty, 0);
    db.close();
  });

  it("clean listing without PII is accepted normally", async () => {
    const listing = fakeListing({ seller_name: "Agence Immobilière Sérieuse" });
    const { stats } = await runIngest([listing]);
    assert.equal(stats.insertedProperty, 1);
    assert.equal(stats.skipped, 0);
  });
});

describe("ingestCleanListings — field integrity", () => {
  it("listing without title is skipped", async () => {
    const { stats } = await runIngest([fakeListing({ title: null })]);
    assert.equal(stats.skipped, 1);
    assert.equal(stats.insertedProperty, 0);
  });

  it("listing without listing_url is skipped", async () => {
    const { stats } = await runIngest([fakeListing({ listing_url: "" })]);
    assert.equal(stats.skipped, 1);
  });

  it("field_confidence object is round-tripped correctly", async () => {
    const conf: FieldConfidence = {
      price: "high", city: "medium", district: "low",
      surface: "missing", rooms: "missing", bedrooms: "high",
      bathrooms: "medium", description: "low", seller: "missing",
    };
    const { db } = await runIngest([fakeListing({ field_confidence: conf })]);

    const row = db.prepare("SELECT field_confidence FROM property_listings").get() as any;
    const parsed = parseJson<FieldConfidence>(row.field_confidence);
    assert.deepEqual(parsed, conf);
    db.close();
  });
});
