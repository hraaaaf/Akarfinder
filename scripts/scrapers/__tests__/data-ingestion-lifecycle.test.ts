import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CollectionListing } from "../../../data-ingestion/collection-adapter.js";
import {
  collectionSourceKey,
  propertyFingerprint,
  purgePortalSource,
  reconcileLifecycleRun,
  type LifecycleRecord,
} from "../../../data-ingestion/lifecycle.js";

function listing(overrides: Partial<CollectionListing> & { source_id: string; hash: string }): CollectionListing {
  const now = "2026-09-03T20:00:00.000Z";
  const sourceType = overrides.provenance?.source_type ?? "portal";
  const sourceName = overrides.source?.name ?? (sourceType === "portal" ? "mubawab" : "agency-alpha");
  return {
    akar_id: null,
    source: {
      name: sourceName,
      source_id: overrides.source_id,
      url: overrides.source?.url ?? `https://example.test/${overrides.source_id}`,
      first_seen_at: overrides.source?.first_seen_at ?? now,
      last_seen_at: overrides.source?.last_seen_at ?? now,
      scraped_at: overrides.source?.scraped_at ?? now,
      content_hash: overrides.hash,
    },
    status: overrides.status ?? "active",
    transaction: overrides.transaction ?? "sale",
    property_type: overrides.property_type ?? "apartment",
    title: overrides.title ?? "Appartement test",
    description: overrides.description ?? "Description",
    price: overrides.price ?? { amount: 1_500_000, currency: "MAD", period: "total", on_request: false },
    surface: overrides.surface ?? { total_m2: 100, habitable_m2: null, built_m2: null, land_m2: null },
    rooms: overrides.rooms ?? 4,
    bedrooms: overrides.bedrooms ?? 2,
    bathrooms: overrides.bathrooms ?? 2,
    floor: overrides.floor ?? 3,
    location: overrides.location ?? {
      country: "Morocco",
      region: null,
      city: "Casablanca",
      district: "Maarif",
      address_text: "Maarif, Casablanca",
      latitude: null,
      longitude: null,
      precision: "neighborhood_centroid",
    },
    features: overrides.features ?? [],
    images: overrides.images ?? [],
    seller: overrides.seller ?? { name: null, type: "unknown", source_profile_url: null },
    provenance: overrides.provenance ?? {
      source_type: sourceType,
      source_listing_url: overrides.source?.url ?? `https://example.test/${overrides.source_id}`,
      retrieval_method: sourceType === "portal" ? "crawl" : "feed",
    },
    quality: overrides.quality ?? { score: 100, warnings: [] },
    raw: overrides.raw ?? {},
  };
}

function record(input: CollectionListing, group = "group-existing", absenceRuns = 0): LifecycleRecord {
  return { source_key: collectionSourceKey(input), property_group_id: group, listing: input, absence_runs: absenceRuns };
}

const scope = { source_name: "mubawab", source_type: "portal" as const };

describe("Lot 5 lifecycle", () => {
  it("is idempotent for an unchanged source listing and only advances last_seen_at", () => {
    const old = listing({ source_id: "1", hash: "a".repeat(64), source: { name: "mubawab", source_id: "1", url: "https://example.test/1", first_seen_at: "2026-09-01T10:00:00.000Z", last_seen_at: "2026-09-01T10:00:00.000Z", scraped_at: "2026-09-01T10:00:00.000Z", content_hash: "a".repeat(64) } });
    const current = listing({ source_id: "1", hash: "a".repeat(64) });
    const result = reconcileLifecycleRun([record(old)], [current], scope, "2026-09-03T21:00:00.000Z");

    assert.equal(result.counts.unchanged, 1);
    assert.equal(result.counts.insert, 0);
    assert.equal(result.records[0].listing.source.first_seen_at, "2026-09-01T10:00:00.000Z");
    assert.equal(result.records[0].listing.source.last_seen_at, "2026-09-03T21:00:00.000Z");
    assert.equal(result.records[0].listing.source.content_hash, "a".repeat(64));
  });

  it("updates the same source key when content_hash changes without creating a new record", () => {
    const old = listing({ source_id: "2", hash: "a".repeat(64), source: { name: "mubawab", source_id: "2", url: "https://example.test/2", first_seen_at: "2026-09-01T10:00:00.000Z", last_seen_at: "2026-09-01T10:00:00.000Z", scraped_at: "2026-09-01T10:00:00.000Z", content_hash: "a".repeat(64) } });
    const changed = listing({ source_id: "2", hash: "b".repeat(64), price: { amount: 1_650_000, currency: "MAD", period: "total", on_request: false } });
    const result = reconcileLifecycleRun([record(old)], [changed], scope, "2026-09-03T21:00:00.000Z");

    assert.equal(result.counts.update, 1);
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].listing.price.amount, 1_650_000);
    assert.equal(result.records[0].listing.source.first_seen_at, "2026-09-01T10:00:00.000Z");
    assert.equal(result.records[0].listing.source.content_hash, "b".repeat(64));
  });

  it("moves an absent in-scope listing active -> stale -> inactive across missing runs", () => {
    const initial = record(listing({ source_id: "3", hash: "c".repeat(64) }));
    const run2 = reconcileLifecycleRun([initial], [], scope, "2026-09-04T00:00:00.000Z");
    assert.equal(run2.counts.stale, 1);
    assert.equal(run2.records[0].listing.status, "stale");
    assert.equal(run2.records[0].absence_runs, 1);

    const run3 = reconcileLifecycleRun(run2.records, [], scope, "2026-09-05T00:00:00.000Z");
    assert.equal(run3.counts.inactive, 1);
    assert.equal(run3.records[0].listing.status, "inactive");
    assert.equal(run3.records[0].absence_runs, 2);
  });

  it("groups duplicate source listings representing the same property without merging source records", () => {
    const a = listing({ source_id: "10", hash: "1".repeat(64) });
    const b = listing({ source_id: "11", hash: "2".repeat(64), price: { amount: 1_550_000, currency: "MAD", period: "total", on_request: false } });
    assert.equal(propertyFingerprint(a), propertyFingerprint(b));

    const result = reconcileLifecycleRun([], [a, b], scope, "2026-09-03T22:00:00.000Z");
    assert.equal(result.counts.insert, 2);
    assert.equal(result.records.length, 2);
    assert.equal(result.records[0].property_group_id, result.records[1].property_group_id);
    assert.notEqual(result.records[0].source_key, result.records[1].source_key);
  });

  it("matches a portal listing to an existing direct property group while preserving the direct record", () => {
    const direct = listing({
      source_id: "agency-77",
      hash: "d".repeat(64),
      source: { name: "agency-alpha", source_id: "agency-77", url: "https://agency.test/77", first_seen_at: "2026-09-01T00:00:00.000Z", last_seen_at: "2026-09-01T00:00:00.000Z", scraped_at: "2026-09-01T00:00:00.000Z", content_hash: "d".repeat(64) },
      provenance: { source_type: "agency_direct", source_listing_url: "https://agency.test/77", retrieval_method: "feed" },
    });
    const directRecord = record(direct, "property-group-direct");
    const portal = listing({ source_id: "77", hash: "e".repeat(64) });

    const result = reconcileLifecycleRun([directRecord], [portal], scope, "2026-09-03T22:00:00.000Z");
    const portalRecord = result.records.find((r) => r.source_key === "mubawab:77");
    const keptDirect = result.records.find((r) => r.source_key === "agency-alpha:agency-77");

    assert.equal(portalRecord?.property_group_id, "property-group-direct");
    assert.equal(keptDirect?.property_group_id, "property-group-direct");
    assert.equal(keptDirect?.listing.provenance.source_type, "agency_direct");
    assert.equal(result.counts.out_of_scope, 1);
  });

  it("purges only portal records for a source and never collateral direct/partner records", () => {
    const portal = record(listing({ source_id: "20", hash: "f".repeat(64) }), "g1");
    const directSameName = listing({
      source_id: "direct-20",
      hash: "9".repeat(64),
      source: { name: "mubawab", source_id: "direct-20", url: "https://direct.test/20", first_seen_at: "2026-09-01T00:00:00.000Z", last_seen_at: "2026-09-01T00:00:00.000Z", scraped_at: "2026-09-01T00:00:00.000Z", content_hash: "9".repeat(64) },
      provenance: { source_type: "agency_direct", source_listing_url: "https://direct.test/20", retrieval_method: "feed" },
    });
    const partner = listing({
      source_id: "partner-1",
      hash: "8".repeat(64),
      source: { name: "partner-x", source_id: "partner-1", url: "https://partner.test/1", first_seen_at: "2026-09-01T00:00:00.000Z", last_seen_at: "2026-09-01T00:00:00.000Z", scraped_at: "2026-09-01T00:00:00.000Z", content_hash: "8".repeat(64) },
      provenance: { source_type: "partner_feed", source_listing_url: "https://partner.test/1", retrieval_method: "feed" },
    });

    const result = purgePortalSource([portal, record(directSameName, "g1"), record(partner, "g2")], "mubawab");
    assert.deepEqual(result.purged.map((r) => r.source_key), ["mubawab:20"]);
    assert.equal(result.kept.length, 2);
    assert.equal(result.kept.some((r) => r.listing.provenance.source_type === "agency_direct"), true);
    assert.equal(result.kept.some((r) => r.listing.provenance.source_type === "partner_feed"), true);
  });

  it("rejects duplicate source keys inside one run", () => {
    const a = listing({ source_id: "30", hash: "a".repeat(64) });
    const b = listing({ source_id: "30", hash: "b".repeat(64) });
    assert.throws(() => reconcileLifecycleRun([], [a, b], scope, "2026-09-03T22:00:00.000Z"), /duplicate_source_key_in_run/);
  });
});
