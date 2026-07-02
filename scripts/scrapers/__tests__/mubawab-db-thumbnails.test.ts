// MUBAWAB-DB-THUMBNAILS-RISK-ACCEPTED-1
// Unit + integration tests for the risk-accepted DB thumbnail pipeline:
// extraction (og:image) -> merge -> schema -> ingest -> map-db-listing -> image-policy.

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { extractDetail } from "../utils/extract.js";
import { mergeDetail, mapRaw } from "../sources/_shared.js";
import { openDb } from "../db/client.js";
import { ingestCleanListings } from "../ingest-clean-listings.js";
import type { ScrapedListingP0, RawListing } from "../types.js";
import { mapDbRowToListing } from "../../../lib/listings/map-db-listing.js";
import type { DbListingRow } from "../../../lib/listings/db-listings.js";
import {
  getListingImageMode,
  isDbProviderThumbnailsEnabled,
} from "../../../lib/listings/image-policy.js";
import type { Listing } from "../../../lib/listings/types.js";

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

// ─── Extraction: og:image ────────────────────────────────────────────────────

describe("extractDetail — thumbnail_url extraction (og:image)", () => {
  it("extracts the og:image meta tag content", () => {
    const html = `<html><head><meta property="og:image" content="https://www.mubawab-media.com/ad/8/277/214F/h/abc_123.avif"></head></html>`;
    const detail = extractDetail(html);
    assert.equal(detail.thumbnail_url, "https://www.mubawab-media.com/ad/8/277/214F/h/abc_123.avif");
  });

  it("returns null when og:image is absent", () => {
    const html = `<html><head><title>No image</title></head></html>`;
    const detail = extractDetail(html);
    assert.equal(detail.thumbnail_url, null);
  });

  it("rejects a non-http(s) og:image value (defensive)", () => {
    const html = `<html><head><meta property="og:image" content="javascript:alert(1)"></head></html>`;
    const detail = extractDetail(html);
    assert.equal(detail.thumbnail_url, null);
  });

  it("does not extract a full gallery — only the single og:image value", () => {
    const html = `<html><head><meta property="og:image" content="https://cdn.example.com/one.jpg"></head><body><img src="https://cdn.example.com/two.jpg"><img src="https://cdn.example.com/three.jpg"></body></html>`;
    const detail = extractDetail(html);
    assert.equal(detail.thumbnail_url, "https://cdn.example.com/one.jpg");
  });
});

// ─── mergeDetail wiring ──────────────────────────────────────────────────────

function baseRaw(): RawListing {
  return {
    listing_url: "https://www.mubawab.ma/fr/a/1/appartement-test",
    title: "Appartement test Casablanca",
    price_raw: "1 200 000 DH",
    city: "Casablanca",
  };
}

describe("mergeDetail — thumbnail_url wiring", () => {
  it("fills listing.thumbnail_url from DetailFields when index phase had none", () => {
    const listing = mapRaw(baseRaw(), "mubawab", "https://www.mubawab.ma/fr/cc/immobilier-a-vendre", "sale");
    assert.equal(listing.thumbnail_url, null);

    const detail = extractDetail(
      `<html><head><meta property="og:image" content="https://www.mubawab-media.com/ad/1/thumb.avif"></head></html>`
    );
    mergeDetail(listing, detail);
    assert.equal(listing.thumbnail_url, "https://www.mubawab-media.com/ad/1/thumb.avif");
  });

  it("never overwrites an existing thumbnail_url", () => {
    const listing = mapRaw(baseRaw(), "mubawab", "https://www.mubawab.ma/fr/cc/immobilier-a-vendre", "sale");
    listing.thumbnail_url = "https://existing.example.com/kept.jpg";

    const detail = extractDetail(
      `<html><head><meta property="og:image" content="https://www.mubawab-media.com/ad/1/other.avif"></head></html>`
    );
    mergeDetail(listing, detail);
    assert.equal(listing.thumbnail_url, "https://existing.example.com/kept.jpg");
  });
});

// ─── Schema migration ────────────────────────────────────────────────────────

describe("db/client.ts — thumbnail_url schema migration", () => {
  it("thumbnail_url column exists after openDb() on a fresh DB", () => {
    const dbPath = join(tmpdir(), `akar-thumb-schema-${Date.now()}.db`);
    tmpFiles.push(dbPath);
    const db = openDb(dbPath);
    const cols = db.prepare("PRAGMA table_info(property_listings)").all() as Array<{ name: string }>;
    db.close();
    assert.ok(cols.some((c) => c.name === "thumbnail_url"));
  });

  it("migration is idempotent — calling openDb() twice does not error", () => {
    const dbPath = join(tmpdir(), `akar-thumb-schema-twice-${Date.now()}.db`);
    tmpFiles.push(dbPath);
    const db1 = openDb(dbPath);
    db1.close();
    const db2 = openDb(dbPath); // second open must not throw on ALTER TABLE
    const cols = db2.prepare("PRAGMA table_info(property_listings)").all() as Array<{ name: string }>;
    db2.close();
    assert.ok(cols.some((c) => c.name === "thumbnail_url"));
  });
});

// ─── Ingest end-to-end ───────────────────────────────────────────────────────

function fullListing(overrides: Partial<ScrapedListingP0> = {}): ScrapedListingP0 {
  return {
    source_name: "mubawab",
    source_url: "https://www.mubawab.ma/fr/cc/immobilier-a-vendre",
    listing_url: "https://www.mubawab.ma/fr/a/999/appt-thumbnail-test",
    title: "Appartement thumbnail test",
    price_raw: "900 000 DH",
    price_mad: 900000,
    city: "Casablanca",
    district: null,
    property_type: "apartment",
    transaction_type: "sale",
    surface_raw: "70 m2",
    surface_m2: 70,
    rooms_count: 3,
    bedrooms_count: 2,
    bathrooms: 1,
    description_snippet: "Bel appartement lumineux",
    images_count: 5,
    thumbnail_url: "https://www.mubawab-media.com/ad/9/999/thumb_999.avif",
    seller_name: null,
    published_at_raw: null,
    scraped_at: new Date().toISOString(),
    data_completeness_score: 80,
    field_confidence: {
      price: "high", city: "high", district: "missing", surface: "high",
      rooms: "high", bedrooms: "high", bathrooms: "high",
      description: "medium", seller: "missing",
    },
    built_surface_m2: null, plot_surface_m2: null, condition: null,
    property_age_range: null, orientation: null, floor_type: null,
    floors_count: null, garden_m2: null, terrace_m2: null, garage_spaces: null,
    has_pool: false, has_concierge: false, has_moroccan_living_room: false,
    has_european_living_room: false, has_equipped_kitchen: false,
    premium_features: [],
    ...overrides,
  };
}

async function writeTmp(name: string, content: string): Promise<string> {
  const p = join(tmpdir(), `akar-thumb-test-${Date.now()}-${name}`);
  await writeFile(p, content, "utf8");
  tmpFiles.push(p);
  return p;
}

describe("ingestCleanListings — thumbnail_url persistence", () => {
  it("persists thumbnail_url into property_listings on insert", async () => {
    const cleanPath = await writeTmp("clean.json", JSON.stringify([fullListing()]));
    const qualityPath = await writeTmp("quality.json", JSON.stringify({ generated_at: "", sources: {} }));
    const dbPath = join(tmpdir(), `akar-thumb-ingest-${Date.now()}.db`);
    tmpFiles.push(dbPath);

    await ingestCleanListings({ cleanPath, qualityPath, dbPath });

    const db = openDb(dbPath);
    const row = db.prepare("SELECT thumbnail_url FROM property_listings LIMIT 1").get() as { thumbnail_url: string | null };
    db.close();
    assert.equal(row.thumbnail_url, "https://www.mubawab-media.com/ad/9/999/thumb_999.avif");
  });

  it("thumbnail_url is null when the listing has none (no crash, no fake data)", async () => {
    const cleanPath = await writeTmp("clean-null.json", JSON.stringify([fullListing({
      listing_url: "https://www.mubawab.ma/fr/a/1000/appt-no-thumb",
      thumbnail_url: null,
    })]));
    const qualityPath = await writeTmp("quality-null.json", JSON.stringify({ generated_at: "", sources: {} }));
    const dbPath = join(tmpdir(), `akar-thumb-ingest-null-${Date.now()}.db`);
    tmpFiles.push(dbPath);

    await ingestCleanListings({ cleanPath, qualityPath, dbPath });

    const db = openDb(dbPath);
    const row = db.prepare("SELECT thumbnail_url FROM property_listings LIMIT 1").get() as { thumbnail_url: string | null };
    db.close();
    assert.equal(row.thumbnail_url, null);
  });

  it("re-ingesting does not overwrite an existing thumbnail_url with null (COALESCE)", async () => {
    const dbPath = join(tmpdir(), `akar-thumb-coalesce-${Date.now()}.db`);
    tmpFiles.push(dbPath);

    const cleanPath1 = await writeTmp("c1.json", JSON.stringify([fullListing()]));
    const qualityPath1 = await writeTmp("q1.json", JSON.stringify({ generated_at: "", sources: {} }));
    await ingestCleanListings({ cleanPath: cleanPath1, qualityPath: qualityPath1, dbPath });

    // Second ingest of the SAME listing but with thumbnail_url now null (e.g. re-scrape failed to find it).
    const cleanPath2 = await writeTmp("c2.json", JSON.stringify([fullListing({ thumbnail_url: null, data_completeness_score: 90 })]));
    const qualityPath2 = await writeTmp("q2.json", JSON.stringify({ generated_at: "", sources: {} }));
    await ingestCleanListings({ cleanPath: cleanPath2, qualityPath: qualityPath2, dbPath });

    const db = openDb(dbPath);
    const row = db.prepare("SELECT thumbnail_url FROM property_listings LIMIT 1").get() as { thumbnail_url: string | null };
    db.close();
    // COALESCE(excluded.thumbnail_url, property_listings.thumbnail_url) keeps the original.
    assert.equal(row.thumbnail_url, "https://www.mubawab-media.com/ad/9/999/thumb_999.avif");
  });
});

// ─── map-db-listing.ts wiring ────────────────────────────────────────────────

function baseDbRow(overrides: Partial<DbListingRow> = {}): DbListingRow {
  return {
    id: 1,
    canonical_fingerprint: "fp-1",
    title: "Appartement test",
    price_mad: 900000,
    city: "Casablanca",
    district: null,
    property_type: "apartment",
    transaction_type: "sale",
    surface_m2: 70,
    rooms_count: 3,
    bedrooms_count: 2,
    bathrooms_count: 1,
    description_snippet: "Bel appartement",
    images_count: 5,
    thumbnail_url: null,
    seller_name: null,
    data_completeness_score: 80,
    field_confidence: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    duplicate_group_id: null,
    duplicate_score: null,
    reliability_score: null,
    reliability_badge: null,
    reliability_reasons: null,
    built_surface_m2: null, plot_surface_m2: null, condition: null,
    property_age_range: null, orientation: null, floor_type: null,
    floors_count: null, garden_m2: null, terrace_m2: null, garage_spaces: null,
    has_pool: 0, has_concierge: 0, has_moroccan_living_room: 0,
    has_european_living_room: 0, has_equipped_kitchen: 0,
    premium_features: null,
    source_name: "mubawab",
    listing_url: "https://www.mubawab.ma/fr/a/1/test",
    source_url: "https://www.mubawab.ma/fr/cc/immobilier-a-vendre",
    ...overrides,
  };
}

describe("mapDbRowToListing — thumbnail wiring", () => {
  it("can_show_thumbnail=true when thumbnail_url is present for a mubawab row", () => {
    const row = baseDbRow({ thumbnail_url: "https://www.mubawab-media.com/ad/1/thumb.avif" });
    const listing = mapDbRowToListing(row);
    assert.equal(listing.can_show_thumbnail, true);
  });

  it("can_show_thumbnail=false when thumbnail_url is absent", () => {
    const row = baseDbRow({ thumbnail_url: null });
    const listing = mapDbRowToListing(row);
    assert.equal(listing.can_show_thumbnail, false);
  });

  it("thumbnail_url is passed through to the Listing object", () => {
    const row = baseDbRow({ thumbnail_url: "https://www.mubawab-media.com/ad/1/thumb.avif" });
    const listing = mapDbRowToListing(row);
    assert.equal(listing.thumbnail_url, "https://www.mubawab-media.com/ad/1/thumb.avif");
  });

  it("can_cache_thumbnail is always false", () => {
    const row = baseDbRow({ thumbnail_url: "https://www.mubawab-media.com/ad/1/thumb.avif" });
    const listing = mapDbRowToListing(row);
    assert.equal(listing.can_cache_thumbnail, false);
  });

  it("can_download_thumbnail is always false", () => {
    const row = baseDbRow({ thumbnail_url: "https://www.mubawab-media.com/ad/1/thumb.avif" });
    const listing = mapDbRowToListing(row);
    assert.equal(listing.can_download_thumbnail, false);
  });

  it("can_show_gallery remains false (unchanged doctrine)", () => {
    const row = baseDbRow({ thumbnail_url: "https://www.mubawab-media.com/ad/1/thumb.avif" });
    const listing = mapDbRowToListing(row);
    assert.equal(listing.can_show_gallery, false);
  });

  it("can_show_contact remains false (unchanged doctrine)", () => {
    const row = baseDbRow({ thumbnail_url: "https://www.mubawab-media.com/ad/1/thumb.avif" });
    const listing = mapDbRowToListing(row);
    assert.equal(listing.can_show_contact, false);
  });

  it("no phone/email/whatsapp field is ever added by the thumbnail wiring", () => {
    const row = baseDbRow({ thumbnail_url: "https://www.mubawab-media.com/ad/1/thumb.avif" });
    const listing = mapDbRowToListing(row);
    assert.equal((listing as any).phone, undefined);
    assert.equal((listing as any).whatsapp, undefined);
    assert.equal((listing as any).email, undefined);
  });
});

// ─── image-policy.ts — kill switch + mode selection ─────────────────────────

function baseListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "1",
    title: "Appartement test",
    city: "Casablanca",
    neighborhood: "",
    price: 900000,
    currency: "DH",
    surface_m2: 70,
    price_per_m2: 12857,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 1,
    freshness_label: "Mise à jour récente",
    source_type: "Source analysée",
    reliability_label: "À vérifier",
    reliability_score: 70,
    is_mre_friendly: false,
    description: "",
    image_url: "",
    reliability_explanation: "",
    ...overrides,
  } as Listing;
}

describe("image-policy.ts — db_provider_thumbnail mode + kill switch", () => {
  it("isDbProviderThumbnailsEnabled reads NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED", () => {
    delete process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED;
    assert.equal(isDbProviderThumbnailsEnabled(), false);
    process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED = "true";
    assert.equal(isDbProviderThumbnailsEnabled(), true);
    delete process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED;
  });

  it("returns db_provider_thumbnail when flag ON + can_show_thumbnail + thumbnail_url present", () => {
    process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED = "true";
    const listing = baseListing({
      can_show_thumbnail: true,
      thumbnail_url: "https://www.mubawab-media.com/ad/1/thumb.avif",
    });
    assert.equal(getListingImageMode(listing), "db_provider_thumbnail");
    delete process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED;
  });

  it("kill switch OFF: never returns db_provider_thumbnail even with valid data", () => {
    delete process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED;
    const listing = baseListing({
      can_show_thumbnail: true,
      thumbnail_url: "https://www.mubawab-media.com/ad/1/thumb.avif",
    });
    assert.equal(getListingImageMode(listing), "fallback_visual");
  });

  it("falls back when can_show_thumbnail=false even with flag ON and a URL present", () => {
    process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED = "true";
    const listing = baseListing({
      can_show_thumbnail: false,
      thumbnail_url: "https://www.mubawab-media.com/ad/1/thumb.avif",
    });
    assert.equal(getListingImageMode(listing), "fallback_visual");
    delete process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED;
  });

  it("falls back when thumbnail_url is absent even with flag ON and can_show_thumbnail true", () => {
    process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED = "true";
    const listing = baseListing({ can_show_thumbnail: true, thumbnail_url: undefined });
    assert.equal(getListingImageMode(listing), "fallback_visual");
    delete process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED;
  });

  it("does not affect the partner real_image path (image_permission_status=allowed)", () => {
    process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED = "true";
    const listing = baseListing({
      image_permission_status: "allowed",
      source_access_level: "partner_full",
      main_image_url: "https://partner.example.com/real.jpg",
    });
    assert.equal(getListingImageMode(listing), "real_image");
    delete process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED;
  });
});
