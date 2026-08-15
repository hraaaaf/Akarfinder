import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideRabatMarketZonesGeoJson } from "../../../lib/geo/rabat-market-zones-geojson";
import { RABAT_MARKET_ZONES_SHADOW } from "../../../lib/geo/rabat-market-zones-shadow";
import type { MarketZoneRecord } from "../../../lib/geo/market-zone-registry";

function reviewedCanaryRecords(): MarketZoneRecord[] {
  return RABAT_MARKET_ZONES_SHADOW.map((zone) => ({
    ...zone,
    publicationStatus: "canary" as const,
    reviewed: true,
  }));
}

describe("Rabat market-zone GeoJSON publication gate", () => {
  it("fails closed for the current Shadow-only pilot", () => {
    assert.deepEqual(decideRabatMarketZonesGeoJson(), {
      enabled: false,
      reason: "shadow_or_unreviewed",
    });
  });

  it("fails closed when the four-zone pilot is incomplete", () => {
    const records = reviewedCanaryRecords().slice(0, 3);
    assert.deepEqual(decideRabatMarketZonesGeoJson(records), {
      enabled: false,
      reason: "incomplete_pilot",
    });
  });

  it("fails closed when a reviewed candidate violates the market-zone contract", () => {
    const records = reviewedCanaryRecords();
    records[0] = { ...records[0], areaKm2: 0 };
    assert.deepEqual(decideRabatMarketZonesGeoJson(records), {
      enabled: false,
      reason: "invalid_record",
    });
  });

  it("emits all four reviewed market zones as non-official GeoJSON features", () => {
    const decision = decideRabatMarketZonesGeoJson(reviewedCanaryRecords());
    assert.equal(decision.enabled, true);
    if (!decision.enabled) return;

    assert.equal(decision.collection.type, "FeatureCollection");
    assert.equal(decision.collection.features.length, 4);
    for (const feature of decision.collection.features) {
      assert.equal(feature.type, "Feature");
      assert.equal(feature.properties.semanticType, "market_zone");
      assert.equal(feature.properties.officialBoundary, false);
      assert.equal(feature.properties.publicationStatus, "canary");
      assert.ok(feature.properties.areaKm2 > 0);
      assert.ok(feature.properties.canonicalNeighborhoodIds.length > 0);
    }
  });
});
