import test from "node:test";
import assert from "node:assert/strict";
import { mapClusterListingToBackfillListing } from "../../../lib/property-intelligence/supabase-backfill-adapter";

test("adapter maps verified canonical cluster/listing relation", () => {
  const row = mapClusterListingToBackfillListing(
    { id: "00000000-0000-5000-8000-000000000001", legacy_property_listing_id: 42 },
    {
      id: 42,
      title: "Appartement rénové",
      description_snippet: "Avec piscine et parking",
      reliability_score: 90,
      condition: "Entièrement rénové",
      property_age_range: "10-20 ans",
      orientation: "south",
      has_pool: true,
      has_concierge: true,
      garage_spaces: 1,
    },
  );

  assert.equal(row.canonicalPropertyId, "00000000-0000-5000-8000-000000000001");
  assert.equal(row.sourceReliability, 0.9);
  assert.deepEqual(row.structured, {
    condition: "Entièrement rénové",
    property_age_range: "10-20 ans",
    orientation: "south",
    has_pool: true,
    has_concierge: true,
    has_parking: true,
  });
});

test("adapter ignores schema-default false flags without explicit provenance", () => {
  const row = mapClusterListingToBackfillListing(
    { id: "00000000-0000-5000-8000-000000000002", legacy_property_listing_id: 43 },
    {
      id: 43,
      title: null,
      description_snippet: null,
      reliability_score: 150,
      condition: null,
      property_age_range: null,
      orientation: null,
      has_pool: false,
      has_concierge: false,
      garage_spaces: 0,
    },
  );

  assert.equal(row.sourceReliability, 1);
  assert.equal(row.structured?.has_pool, undefined);
  assert.equal(row.structured?.has_concierge, undefined);
  assert.equal(row.structured?.has_parking, undefined);
});

test("adapter preserves nullable unknown structured values", () => {
  const row = mapClusterListingToBackfillListing(
    { id: "00000000-0000-5000-8000-000000000003", legacy_property_listing_id: 44 },
    {
      id: 44,
      title: null,
      description_snippet: null,
      reliability_score: null,
      condition: null,
      property_age_range: null,
      orientation: null,
      has_pool: null,
      has_concierge: null,
      garage_spaces: null,
    },
  );

  assert.equal(row.sourceReliability, undefined);
  assert.equal(row.structured?.has_pool, undefined);
  assert.equal(row.structured?.has_concierge, undefined);
  assert.equal(row.structured?.has_parking, undefined);
});

test("adapter refuses a broken canonical relation", () => {
  assert.throws(() => mapClusterListingToBackfillListing(
    { id: "00000000-0000-5000-8000-000000000004", legacy_property_listing_id: 45 },
    {
      id: 46,
      title: null,
      description_snippet: null,
      reliability_score: null,
      condition: null,
      property_age_range: null,
      orientation: null,
      has_pool: null,
      has_concierge: null,
      garage_spaces: null,
    },
  ), /cluster_listing_mismatch/);
});
