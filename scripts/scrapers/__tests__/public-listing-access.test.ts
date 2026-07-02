// PUBLIC-READMODEL-AUTHORIZED-ONLY-1
// Tests for the public listing access guards and their integration with the
// read-model (database-search / api/listings filter chain).

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  canPublishListingToPublicSurface,
  canPublishDbRowToPublicSurface,
} from "../../../lib/listings/public-listing-access.js";
import { queryDbListings } from "../../../lib/listings/db-listings.js";
import { mapDbRowToListing } from "../../../lib/listings/map-db-listing.js";
import { ingestCleanListings } from "../ingest-clean-listings.js";
import type { ScrapedListingP0 } from "../types.js";
import type { Listing } from "../../../lib/listings/types.js";
import type { DbListingRow } from "../../../lib/listings/db-listings.js";

// ─── Setup ────────────────────────────────────────────────────────────────────

const tmpFiles: string[] = [];
const savedThirdPartyFlag = process.env.THIRD_PARTY_DB_INGESTION_ENABLED;
process.env.THIRD_PARTY_DB_INGESTION_ENABLED = "true";

after(async () => {
  for (const f of tmpFiles) {
    try { await unlink(f); } catch { /* ignore */ }
  }
  if (savedThirdPartyFlag === undefined) delete process.env.THIRD_PARTY_DB_INGESTION_ENABLED;
  else process.env.THIRD_PARTY_DB_INGESTION_ENABLED = savedThirdPartyFlag;
});

async function writeTmp(name: string, content: string) {
  const p = join(tmpdir(), `akar-access-${Date.now()}-${name}`);
  await writeFile(p, content, "utf8");
  tmpFiles.push(p);
  return p;
}

function fakeListing(overrides: Partial<ScrapedListingP0> = {}): ScrapedListingP0 {
  return {
    source_name: "mubawab",
    source_url: "https://mubawab.ma",
    listing_url: `https://mubawab.ma/fr/annonce/${Math.random()}`,
    title: "Appartement test",
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
    description_snippet: "Appartement bien situé",
    images_count: 3,
    seller_name: "Agence Test",
    published_at_raw: null,
    scraped_at: new Date().toISOString(),
    data_completeness_score: 80,
    field_confidence: {},
    ...overrides,
  };
}

async function buildTestDb(listings: ScrapedListingP0[]) {
  const cleanPath = await writeTmp("clean.json", JSON.stringify(listings));
  const qualityPath = await writeTmp("quality.json", "{}");
  const dbPath = join(tmpdir(), `akar-access-${Date.now()}.db`);
  tmpFiles.push(dbPath);
  await ingestCleanListings({ cleanPath, qualityPath, dbPath });
  return dbPath;
}

// ─── canPublishListingToPublicSurface — Listing objects ───────────────────────

function makeListingWithSource(sourceName: string | undefined): Listing {
  return { source_name: sourceName } as Listing;
}

describe("canPublishListingToPublicSurface — legacy third-party blocked", () => {
  it("mubawab => false", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("Mubawab")), false);
  });

  it("mubawab lowercase => false", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("mubawab")), false);
  });

  it("avito => false", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("Avito")), false);
  });

  it("sarouty => false", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("Sarouty")), false);
  });
});

describe("canPublishListingToPublicSurface — benchmark blocked", () => {
  it("yakeey => false", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("yakeey")), false);
  });
});

describe("canPublishListingToPublicSurface — external live blocked", () => {
  it("avito_serper => false", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("avito_serper")), false);
  });

  it("search_gateway => false", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("search_gateway")), false);
  });
});

describe("canPublishListingToPublicSurface — unknown blocked", () => {
  it("undefined source => false", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource(undefined)), false);
  });

  it("empty string source => false", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("")), false);
  });

  it("unknown portal => false", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("some_unknown")), false);
  });
});

describe("canPublishListingToPublicSurface — authorized sources allowed", () => {
  it("akarfinder => true", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("akarfinder")), true);
  });

  it("internal => true", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("internal")), true);
  });

  it("partner_csv => true", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("partner_csv")), true);
  });
});

// ─── canPublishDbRowToPublicSurface — DbListingRow objects ────────────────────

function makeDbRow(sourceName: string | null): DbListingRow {
  return { source_name: sourceName } as DbListingRow;
}

describe("canPublishDbRowToPublicSurface — raw DB rows", () => {
  it("mubawab row => false", () => {
    assert.equal(canPublishDbRowToPublicSurface(makeDbRow("mubawab")), false);
  });

  it("avito row => false", () => {
    assert.equal(canPublishDbRowToPublicSurface(makeDbRow("avito")), false);
  });

  it("null source row => false (unknown fallback)", () => {
    assert.equal(canPublishDbRowToPublicSurface(makeDbRow(null)), false);
  });

  it("partner_csv row => true", () => {
    assert.equal(canPublishDbRowToPublicSurface(makeDbRow("partner_csv")), true);
  });

  it("akarfinder row => true", () => {
    assert.equal(canPublishDbRowToPublicSurface(makeDbRow("akarfinder")), true);
  });
});

// ─── DB integration: mubawab rows are filtered out by guard ───────────────────

describe("authorized-only filter — mubawab rows excluded from public surface", () => {
  it("mubawab rows in DB are not publishable to public surfaces", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ source_name: "mubawab", listing_url: "https://mubawab.ma/fr/a/100", city: "Casablanca", price_mad: 1_000_000 }),
      fakeListing({ source_name: "mubawab", listing_url: "https://mubawab.ma/fr/a/101", city: "Rabat", price_mad: 2_000_000 }),
    ]);

    const { listings } = queryDbListings({}, dbPath);
    assert.equal(listings.length, 2, "DB should have 2 rows");

    const publishable = listings.filter(canPublishDbRowToPublicSurface);
    assert.equal(publishable.length, 0, "0 mubawab rows should be publishable");
  });

  it("mubawab Listing objects are not publishable after mapping", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ source_name: "mubawab", listing_url: "https://mubawab.ma/fr/a/200" }),
    ]);

    const { listings: rows } = queryDbListings({}, dbPath);
    const mappedListings = rows.map((row) => mapDbRowToListing(row));
    const publishable = mappedListings.filter(canPublishListingToPublicSurface);

    assert.equal(publishable.length, 0, "Mapped mubawab listings must not be publishable");
  });
});

describe("authorized-only filter — avito rows excluded from public surface", () => {
  it("avito rows in DB are not publishable", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ source_name: "avito", listing_url: "https://avito.ma/a/300" }),
    ]);

    const { listings } = queryDbListings({}, dbPath);
    const publishable = listings.filter(canPublishDbRowToPublicSurface);
    assert.equal(publishable.length, 0);
  });
});

describe("authorized-only filter — sarouty rows excluded from public surface", () => {
  it("sarouty rows in DB are not publishable", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ source_name: "sarouty", listing_url: "https://sarouty.ma/a/400" }),
    ]);

    const { listings } = queryDbListings({}, dbPath);
    const publishable = listings.filter(canPublishDbRowToPublicSurface);
    assert.equal(publishable.length, 0);
  });
});

describe("authorized-only filter — partner_csv rows are publishable", () => {
  it("partner_csv rows in DB are publishable", async () => {
    const dbPath = await buildTestDb([
      fakeListing({ source_name: "partner_csv", listing_url: "https://partner.example.com/a/500" }),
    ]);

    const { listings } = queryDbListings({}, dbPath);
    const publishable = listings.filter(canPublishDbRowToPublicSurface);
    assert.equal(publishable.length, 1, "partner_csv rows must be publishable");
  });
});

// ─── Cross-cutting invariants ─────────────────────────────────────────────────

describe("public listing access — invariants", () => {
  it("all legacy third-party sources are blocked", () => {
    const legacySources = ["mubawab", "avito", "sarouty"];
    for (const s of legacySources) {
      assert.equal(
        canPublishListingToPublicSurface(makeListingWithSource(s)),
        false,
        `${s} must not be publishable`
      );
    }
  });

  it("all Search Gateway sources are blocked", () => {
    const sgSources = [
      "avito_serper", "sarouty_serper", "agenz_serper",
      "logic_immo_serper", "mubawab_serper", "serper", "search_gateway",
    ];
    for (const s of sgSources) {
      assert.equal(
        canPublishListingToPublicSurface(makeListingWithSource(s)),
        false,
        `${s} must not be publishable`
      );
    }
  });

  it("benchmark source (yakeey) is always blocked from structured listings", () => {
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("yakeey")), false);
    assert.equal(canPublishListingToPublicSurface(makeListingWithSource("Yakeey")), false);
  });

  it("authorized sources (first_party, partner_authorized) pass through", () => {
    const authorized = ["akarfinder", "internal", "partner_csv"];
    for (const s of authorized) {
      assert.equal(
        canPublishListingToPublicSurface(makeListingWithSource(s)),
        true,
        `${s} must be publishable`
      );
    }
  });
});
