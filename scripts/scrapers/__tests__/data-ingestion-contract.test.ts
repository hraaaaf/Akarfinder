import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { adaptCollectionListing, type CollectionListing } from "../../../data-ingestion/collection-adapter.js";

const ROOT = resolve(process.cwd());

function fixture(name: string): CollectionListing {
  return JSON.parse(readFileSync(resolve(ROOT, "data-ingestion", "samples", name), "utf8")) as CollectionListing;
}

function assertCollectionShape(input: CollectionListing) {
  assert.ok(input.source.name.length > 0);
  assert.ok(input.source.source_id.length > 0);
  assert.match(input.source.url, /^https?:\/\//);
  assert.match(input.source.content_hash, /^[a-f0-9]{64}$/);
  assert.ok(["active", "stale", "inactive", "rejected"].includes(input.status));
  assert.ok(input.transaction === "sale" || input.transaction === "rent" || input.transaction === null);
  assert.equal(input.location.country, "Morocco");
  assert.equal(input.price.currency, "MAD");
  assert.ok(input.price.amount == null || input.price.amount > 0);
  if (input.price.on_request) assert.equal(input.price.amount, null);
  assert.ok(input.surface.total_m2 == null || input.surface.total_m2 > 0);
  assert.ok(input.rooms == null || input.rooms >= 0);
  assert.ok(input.bedrooms == null || input.bedrooms >= 0);
  assert.ok(input.bathrooms == null || input.bathrooms >= 0);
}

describe("Data ingestion collection contract", () => {
  const names = [
    "listing.minimal.json",
    "listing.complete.json",
    "listing.villa.json",
    "listing.land.json",
  ];

  for (const name of names) {
    it(`accepts fixture ${name}`, () => {
      const input = fixture(name);
      assertCollectionShape(input);
      const canonical = adaptCollectionListing(input, "fixture-run");

      assert.equal(canonical.schema_version, "1.0");
      assert.equal(canonical.offers.length, 1);
      assert.equal(canonical.offers[0].external_offer_id, input.source.source_id);
      assert.equal(canonical.offers[0].transaction_type, input.transaction);
      assert.equal(canonical.facts.classification.property_type.value, input.property_type ?? "unknown");
      assert.equal(canonical.facts.location.city.value, input.location.city);
      assert.equal(canonical.facts.surfaces.surface_total_m2?.value ?? null, input.surface.total_m2);
      assert.equal(canonical.facts.layout.bedrooms_count?.value ?? null, input.bedrooms);
      assert.equal(canonical.media.length, input.images.length);
      assert.equal(canonical.offers[0].ingestion_run_id, "fixture-run");
    });
  }

  it("rejects a missing transaction instead of fabricating a sale", () => {
    const input = fixture("listing.minimal.json");
    input.transaction = null;
    assert.throws(
      () => adaptCollectionListing(input),
      /collection_listing_transaction_required_for_canonical_offer/,
    );
  });

  it("keeps missing price as undisclosed rather than zero", () => {
    const canonical = adaptCollectionListing(fixture("listing.minimal.json"));
    assert.equal(canonical.offers[0].price_amount.value, null);
    assert.equal(canonical.offers[0].price_status, "not_disclosed");
  });

  it("does not impose apartment fields on land", () => {
    const canonical = adaptCollectionListing(fixture("listing.land.json"));
    assert.equal(canonical.facts.classification.property_type.value, "land");
    assert.equal(canonical.facts.layout.bedrooms_count?.value ?? null, null);
    assert.equal(canonical.facts.surfaces.surface_land_m2?.value, 1200);
  });

  it("preserves agency_direct origin and direct media permissions", () => {
    const direct = adaptCollectionListing(fixture("listing.complete.json"));
    const portal = adaptCollectionListing(fixture("listing.villa.json"));
    assert.equal(direct.offers[0].origin_type, "agency_direct");
    assert.equal(direct.media[0]?.publication_permission, "allowed");
    assert.equal(portal.media.length, 0);
    assert.equal(direct.offers[0].compliance_status, "allowed");
    assert.equal(portal.offers[0].compliance_status, "review_required");
  });
});
