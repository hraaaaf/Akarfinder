import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ingestCleanListings } from "../ingest-clean-listings.js";
import {
  getDbListingById,
  isDbAvailable,
  queryDbListings,
} from "../../../lib/listings/db-listings.js";
import { mapDbRowToListing } from "../../../lib/listings/map-db-listing.js";
import { formatPrice } from "../../../lib/listings/utils.js";
import type { ScrapedListingP0 } from "../types.js";

const tmpFiles: string[] = [];
const savedThirdPartyDbIngestion = process.env.THIRD_PARTY_DB_INGESTION_ENABLED;
process.env.THIRD_PARTY_DB_INGESTION_ENABLED = "true";

describe("public price formatting", () => {
  it("never renders a missing or invalid price as 0 DH", () => {
    assert.equal(formatPrice(null), "Prix non communique");
    assert.equal(formatPrice(0), "Prix non communique");
    assert.equal(formatPrice(-1), "Prix non communique");
  });

  it("preserves valid prices", () => {
    assert.match(formatPrice(7_500), /7.*500 DH/);
  });
});

after(async () => {
  for (const filePath of tmpFiles) {
    try {
      await unlink(filePath);
    } catch {
      // Ignore cleanup failures for already-removed temp files.
    }
  }
  if (savedThirdPartyDbIngestion === undefined) delete process.env.THIRD_PARTY_DB_INGESTION_ENABLED;
  else process.env.THIRD_PARTY_DB_INGESTION_ENABLED = savedThirdPartyDbIngestion;
});

async function writeTmp(name: string, content: string) {
  const filePath = join(tmpdir(), `akar-p4-${Date.now()}-${name}`);
  await writeFile(filePath, content, "utf8");
  tmpFiles.push(filePath);
  return filePath;
}

function fakeListing(
  overrides: Partial<ScrapedListingP0> = {}
): ScrapedListingP0 {
  return {
    source_name: "mubawab",
    source_url: "https://mubawab.ma",
    listing_url: "https://mubawab.ma/fr/annonce/1",
    title: "Appartement lumineux",
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
    images_count: 6,
    seller_name: "Agence Centrale",
    published_at_raw: null,
    scraped_at: new Date().toISOString(),
    data_completeness_score: 88,
    field_confidence: {
      price: "high",
      city: "high",
      district: "high",
      surface: "high",
      rooms: "medium",
      bedrooms: "high",
      bathrooms: "medium",
      description: "medium",
      seller: "high",
    },
    ...overrides,
  };
}

async function buildTestDb(listings: ScrapedListingP0[]) {
  const cleanPath = await writeTmp("clean.json", JSON.stringify(listings));
  const qualityPath = await writeTmp("quality.json", "{}");
  const dbPath = join(tmpdir(), `akar-p4-${Date.now()}.db`);
  tmpFiles.push(dbPath);
  await ingestCleanListings({ cleanPath, qualityPath, dbPath });
  return dbPath;
}

describe("isDbAvailable", () => {
  it("returns false for a non-existent path", () => {
    assert.equal(isDbAvailable("/tmp/does-not-exist-akar.db"), false);
  });

  it("returns true for a real DB file", async () => {
    const dbPath = await buildTestDb([fakeListing()]);
    assert.equal(isDbAvailable(dbPath), true);
  });
});

describe("queryDbListings - absent DB", () => {
  it("returns empty result when DB file does not exist", () => {
    const result = queryDbListings({}, "/tmp/no-such-akar.db");
    assert.equal(result.total, 0);
    assert.deepEqual(result.listings, []);
  });
});

describe("queryDbListings - reads", () => {
  it("returns ingested listings and correct total", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/a/1" }),
      fakeListing({ listing_url: "https://mubawab.ma/fr/a/2", city: "Rabat" }),
    ]);

    const result = queryDbListings({}, dbPath);
    assert.equal(result.total, 2);
    assert.equal(result.listings.length, 2);
  });

  it("populates source_name and listing_url from listing_sources", async () => {
    const dbPath = await buildTestDb([fakeListing()]);
    const result = queryDbListings({}, dbPath);

    assert.equal(result.listings.length, 1);
    assert.equal(result.listings[0].source_name, "mubawab");
    assert.ok(result.listings[0].listing_url?.startsWith("https://"));
  });

  it("can fetch a single listing by id", async () => {
    const dbPath = await buildTestDb([fakeListing()]);
    const result = queryDbListings({}, dbPath);
    const row = getDbListingById(String(result.listings[0].id), dbPath);

    assert.ok(row);
    assert.equal(row?.title, "Appartement lumineux");
  });
});

describe("queryDbListings - filters", () => {
  it("returns only listings matching the city", async () => {
    const dbPath = await buildTestDb([
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/10",
        city: "Casablanca",
      }),
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/11",
        city: "Rabat",
      }),
    ]);

    const result = queryDbListings({ city: "Casablanca" }, dbPath);
    assert.equal(result.total, 1);
    assert.equal(result.listings[0].city, "Casablanca");
  });

  it("supports property_type filters", async () => {
    const dbPath = await buildTestDb([
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/15",
        property_type: "apartment",
      }),
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/16",
        property_type: "villa",
      }),
    ]);

    const result = queryDbListings({ property_type: "villa" }, dbPath);
    assert.equal(result.total, 1);
    assert.equal(result.listings[0].property_type, "villa");
  });

  it("supports French property_type filters from the frontend", async () => {
    const dbPath = await buildTestDb([
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/17",
        property_type: "apartment",
      }),
    ]);

    const result = queryDbListings({ property_type: "Appartement" }, dbPath);
    assert.equal(result.total, 1);
  });

  it("returns only sale listings when filtered", async () => {
    const dbPath = await buildTestDb([
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/20",
        transaction_type: "sale",
      }),
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/21",
        transaction_type: "rent",
      }),
    ]);

    const saleResult = queryDbListings({ transaction_type: "sale" }, dbPath);
    assert.equal(saleResult.total, 1);

    const frontendResult = queryDbListings(
      { transaction_type: "buy" },
      dbPath
    );
    assert.equal(frontendResult.total, 1);

    const rentResult = queryDbListings({ transaction_type: "rent" }, dbPath);
    assert.equal(rentResult.total, 1);
  });

  it("respects min_price filter", async () => {
    const dbPath = await buildTestDb([
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/30",
        price_mad: 500_000,
      }),
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/31",
        price_mad: 1_500_000,
      }),
    ]);

    const result = queryDbListings({ min_price: 1_000_000 }, dbPath);
    assert.equal(result.total, 1);
    assert.equal(result.listings[0].price_mad, 1_500_000);
  });

  it("respects max_price filter", async () => {
    const dbPath = await buildTestDb([
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/40",
        price_mad: 500_000,
      }),
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/41",
        price_mad: 2_000_000,
      }),
    ]);

    const result = queryDbListings({ max_price: 900_000 }, dbPath);
    assert.equal(result.total, 1);
    assert.equal(result.listings[0].price_mad, 500_000);
  });

  it("respects limit and offset", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ listing_url: "https://mubawab.ma/fr/a/50" }),
      fakeListing({ listing_url: "https://mubawab.ma/fr/a/51", city: "Rabat" }),
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/52",
        city: "Marrakech",
      }),
    ]);

    const pageOne = queryDbListings({ limit: 1, offset: 0 }, dbPath);
    const pageTwo = queryDbListings({ limit: 1, offset: 1 }, dbPath);

    assert.equal(pageOne.listings.length, 1);
    assert.equal(pageTwo.listings.length, 1);
    assert.notEqual(pageOne.listings[0].id, pageTwo.listings[0].id);
  });
});

describe("mapDbRowToListing - field mapping", () => {
  it("maps property_type and transaction_type to frontend values", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ property_type: "apartment", transaction_type: "sale" }),
    ]);
    const result = queryDbListings({}, dbPath);
    const listing = mapDbRowToListing(result.listings[0]);

    assert.equal(listing.property_type, "Appartement");
    assert.equal(listing.transaction_type, "buy");
  });

  it("maps villa property_type correctly", async () => {
    const dbPath = await buildTestDb([
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/v1",
        property_type: "villa",
      }),
    ]);
    const result = queryDbListings({}, dbPath);
    assert.equal(mapDbRowToListing(result.listings[0]).property_type, "Villa");
  });

  it("maps rent transaction_type correctly", async () => {
    const dbPath = await buildTestDb([
      fakeListing({
        listing_url: "https://mubawab.ma/fr/a/r1",
        transaction_type: "rent",
      }),
    ]);
    const result = queryDbListings({}, dbPath);
    assert.equal(mapDbRowToListing(result.listings[0]).transaction_type, "rent");
  });

  it("computes price_per_m2 correctly", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ price_mad: 1_000_000, surface_m2: 100 }),
    ]);
    const result = queryDbListings({}, dbPath);
    const listing = mapDbRowToListing(result.listings[0]);
    assert.equal(listing.price_per_m2, 10_000);
  });

  it("exposes data_completeness_score and source_name", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ data_completeness_score: 88 }),
    ]);
    const result = queryDbListings({}, dbPath);
    const listing = mapDbRowToListing(result.listings[0]);

    assert.equal(listing.data_completeness_score, 88);
    assert.equal(listing.source_name, "Mubawab");
    // P5: reliability_available is now true since reliability_score is computed properly.
    assert.equal(listing.reliability_available, true);
  });

  it("mapping is stable - same input produces same output", async () => {
    const dbPath = await buildTestDb([fakeListing()]);
    const result = queryDbListings({}, dbPath);
    const row = result.listings[0];

    const first = mapDbRowToListing(row);
    const second = mapDbRowToListing(row);
    assert.deepEqual(first, second);
  });
});

describe("PII guard - no phone or email in mapped output", () => {
  it("skips listings that contain phone numbers in description_snippet", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ description_snippet: "Contactez 0612345678 pour visiter" }),
    ]);
    const result = queryDbListings({}, dbPath);
    assert.equal(result.total, 0);
    assert.deepEqual(result.listings, []);
  });

  it("skips listings that contain email in seller_name", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ seller_name: "agence@test.ma" }),
    ]);
    const result = queryDbListings({}, dbPath);
    assert.equal(result.total, 0);
    assert.deepEqual(result.listings, []);
  });

  it("does not expose seller_name directly when listing is clean", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ seller_name: "Agence Immobilière" }),
    ]);
    const result = queryDbListings({}, dbPath);
    const listing = mapDbRowToListing(result.listings[0]);

    assert.equal(listing.seller_name, "Agence Immobilière");
    assert.equal(listing.description, "Bel appartement avec terrasse");
  });
});
