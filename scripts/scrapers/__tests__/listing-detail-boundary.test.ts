// LISTING-DETAIL-BOUNDARY-HARDENING-1
// Invariant tests ensuring that /listings/[id] only serves full internal
// detail pages for first_party and partner_authorized sources.
//
// The page-level guard is:
//   if (!canShowInternalListingDetail(listing.source_name ?? "")) notFound()
//
// These tests verify that the guard function produces the correct output
// for every source category and that the DB integration returns the correct
// source_name for legacy rows (so the guard fires on real data).

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  canShowInternalListingDetail,
  canPublishStructuredListing,
  getSourceAccessType,
} from "../../../lib/sources/source-access-registry.js";

// ─── Authorized sources ────────────────────────────────────────────────────────

describe("listing-detail-boundary — sources autorisées (fiche complète OK)", () => {
  const AUTHORIZED = ["akarfinder", "internal", "first_party", "own", "partner_csv"];

  for (const src of AUTHORIZED) {
    it(`${src}: canShowInternalListingDetail=true`, () => {
      assert.equal(
        canShowInternalListingDetail(src),
        true,
        `${src} must be allowed as a full detail page`
      );
    });

    it(`${src}: canPublishStructuredListing=true (read-model consistent)`, () => {
      assert.equal(canPublishStructuredListing(src), true);
    });
  }
});

// ─── Third-party legacy — DB rows frozen ──────────────────────────────────────

describe("listing-detail-boundary — third_party_legacy bloqués", () => {
  const LEGACY = ["mubawab", "Mubawab", "avito", "Avito", "sarouty", "Sarouty"];

  for (const src of LEGACY) {
    it(`${src}: canShowInternalListingDetail=false`, () => {
      assert.equal(
        canShowInternalListingDetail(src),
        false,
        `Legacy source "${src}" must NOT be served as a full internal detail page`
      );
    });

    it(`${src}: access type = third_party_legacy`, () => {
      assert.equal(getSourceAccessType(src.toLowerCase()), "third_party_legacy");
    });
  }
});

// ─── Gateway / public_external_live ───────────────────────────────────────────

describe("listing-detail-boundary — public_external_live bloqués", () => {
  const GATEWAY = ["agenz", "logic-immo", "logic_immo", "avito_serper", "sarouty_serper", "search_gateway", "serper"];

  for (const src of GATEWAY) {
    it(`${src}: canShowInternalListingDetail=false`, () => {
      assert.equal(
        canShowInternalListingDetail(src),
        false,
        `Gateway source "${src}" must never get an internal detail page`
      );
    });
  }
});

// ─── Benchmark-only ───────────────────────────────────────────────────────────

describe("listing-detail-boundary — benchmark_source bloqués", () => {
  const BENCHMARK = ["yakeey", "Yakeey", "yakeey_serper"];

  for (const src of BENCHMARK) {
    it(`${src}: canShowInternalListingDetail=false`, () => {
      assert.equal(
        canShowInternalListingDetail(src),
        false,
        `Benchmark source "${src}" must never get an internal detail page`
      );
    });
  }
});

// ─── Unknown / null / empty ───────────────────────────────────────────────────

describe("listing-detail-boundary — source inconnue bloquée (fail-closed)", () => {
  it("empty string: canShowInternalListingDetail=false", () => {
    assert.equal(canShowInternalListingDetail(""), false);
  });

  it("unknown source: canShowInternalListingDetail=false", () => {
    assert.equal(canShowInternalListingDetail("some_unknown_source_xyz"), false);
  });

  it("null-like (empty fallback): canShowInternalListingDetail=false", () => {
    // Simulates listing.source_name ?? "" when source_name is null
    assert.equal(canShowInternalListingDetail(""), false);
  });
});

// ─── Consistency: detail boundary == read-model boundary ──────────────────────
// Both guards must agree: if a listing can appear in search results, it must
// also be allowed as a detail page, and vice versa.

describe("listing-detail-boundary — cohérence avec le read-model", () => {
  const ALL_KNOWN_SOURCES = [
    "akarfinder", "internal", "first_party", "own", "partner_csv",
    "mubawab", "avito", "sarouty",
    "agenz", "logic-immo", "logic_immo", "avito_serper", "sarouty_serper",
    "search_gateway", "serper", "agenz_serper", "logic_immo_serper", "mubawab_serper",
    "yakeey", "yakeey_serper",
  ];

  for (const src of ALL_KNOWN_SOURCES) {
    it(`${src}: canShowInternalListingDetail === canPublishStructuredListing`, () => {
      assert.equal(
        canShowInternalListingDetail(src),
        canPublishStructuredListing(src),
        `Detail boundary and read-model boundary must agree for source "${src}"`
      );
    });
  }
});

// ─── DB integration — legacy source_name preserved through ingest pipeline ────
// Uses a temp DB + ingestCleanListings (same pattern as public-listing-access tests).
// Verifies that source_name survives the ingest pipeline intact so the guard
// fires correctly at read time.

import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ingestCleanListings } from "../ingest-clean-listings.js";
import { queryDbListings } from "../../../lib/listings/db-listings.js";
import type { ScrapedListingP0 } from "../types.js";

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
  const p = join(tmpdir(), `akar-boundary-${Date.now()}-${name}`);
  await writeFile(p, content, "utf8");
  tmpFiles.push(p);
  return p;
}

function fakeRow(overrides: Partial<ScrapedListingP0> = {}): ScrapedListingP0 {
  return {
    source_name: "mubawab",
    source_url: "https://mubawab.ma",
    listing_url: `https://mubawab.ma/annonce/${Math.random()}`,
    title: "Appartement test boundary",
    price_raw: "1 000 000 DH",
    price_mad: 1_000_000,
    city: "Casablanca",
    district: "Maarif",
    property_type: "apartment",
    transaction_type: "sale",
    surface_raw: "80 m²",
    surface_m2: 80,
    rooms_count: 3,
    bedrooms_count: 2,
    bathrooms: 1,
    description_snippet: "Test boundary",
    images_count: 0,
    seller_name: null,
    published_at_raw: null,
    scraped_at: new Date().toISOString(),
    data_completeness_score: 60,
    field_confidence: {},
    ...overrides,
  };
}

async function buildTmpDb(rows: ScrapedListingP0[]) {
  const cleanPath = await writeTmp("clean.json", JSON.stringify(rows));
  const qualityPath = await writeTmp("quality.json", "{}");
  const dbPath = join(tmpdir(), `akar-boundary-${Date.now()}.db`);
  tmpFiles.push(dbPath);
  await ingestCleanListings({ cleanPath, qualityPath, dbPath });
  return dbPath;
}

describe("listing-detail-boundary — intégration DB: source_name conservé après ingest", () => {
  let dbPath: string;

  before(async () => {
    const rows = [
      fakeRow({ source_name: "mubawab", city: "Casablanca", price_mad: 1_000_000 }),
      fakeRow({ source_name: "partner_csv", listing_url: "https://partner.example.ma/villa", city: "Rabat", price_mad: 2_000_000 }),
    ];
    dbPath = await buildTmpDb(rows);
  });

  it("mubawab ingested row: source_name preserved => guard blocks detail", async () => {
    const result = await queryDbListings({ limit: 100 }, dbPath);
    const mubawabRows = result.listings.filter((r) => (r.source_name ?? "").toLowerCase() === "mubawab");
    assert.ok(mubawabRows.length > 0, "At least one mubawab row must be in the test DB");
    for (const row of mubawabRows) {
      assert.equal(
        canShowInternalListingDetail(row.source_name ?? ""),
        false,
        `DB row source_name="${row.source_name}" must block detail page`
      );
    }
  });

  it("partner_csv ingested row: source_name preserved => guard allows detail", async () => {
    const result = await queryDbListings({ limit: 100 }, dbPath);
    const partnerRows = result.listings.filter((r) => (r.source_name ?? "").toLowerCase() === "partner_csv");
    assert.ok(partnerRows.length > 0, "At least one partner_csv row must be in the test DB");
    for (const row of partnerRows) {
      assert.equal(
        canShowInternalListingDetail(row.source_name ?? ""),
        true,
        `DB row source_name="${row.source_name}" must allow detail page`
      );
    }
  });
});
