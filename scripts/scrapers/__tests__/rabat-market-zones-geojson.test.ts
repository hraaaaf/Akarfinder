import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET } from "../../../app/api/geo/rabat-market-zones/route";
import { RABAT_MARKET_ZONES_CANARY, rabatMarketZonesCanaryAreValid } from "../../../lib/geo/rabat-market-zones-canary";
import { decideRabatMarketZonesGeoJson } from "../../../lib/geo/rabat-market-zones-geojson";
import { RABAT_MARKET_ZONES_SHADOW } from "../../../lib/geo/rabat-market-zones-shadow";
import type { MarketZoneRecord } from "../../../lib/geo/market-zone-registry";

describe("Rabat market-zone GeoJSON publication gate", () => {
  it("promotes exactly the four reviewed market zones to Canary", () => {
    assert.equal(rabatMarketZonesCanaryAreValid(), true);
    assert.equal(RABAT_MARKET_ZONES_CANARY.length, 4);
    for (const zone of RABAT_MARKET_ZONES_CANARY) {
      assert.equal(zone.publicationStatus, "canary");
      assert.equal(zone.reviewed, true);
      assert.equal(zone.officialBoundary, false);
    }
  });

  it("serves the reviewed Canary pilot by default", async () => {
    const decision = decideRabatMarketZonesGeoJson();
    assert.equal(decision.enabled, true);
    if (!decision.enabled) return;
    assert.equal(decision.collection.features.length, 4);

    const response = await GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-akarfinder-geometry-semantic-type"), "market_zone");
    assert.equal(response.headers.get("x-akarfinder-official-boundary"), "false");
    const body = await response.json();
    assert.equal(body.features.length, 4);
  });

  it("still fails closed when explicitly given Shadow/unreviewed records", () => {
    assert.deepEqual(decideRabatMarketZonesGeoJson(RABAT_MARKET_ZONES_SHADOW), {
      enabled: false,
      reason: "shadow_or_unreviewed",
    });
  });

  it("fails closed when the four-zone pilot is incomplete", () => {
    const records = RABAT_MARKET_ZONES_CANARY.slice(0, 3);
    assert.deepEqual(decideRabatMarketZonesGeoJson(records), {
      enabled: false,
      reason: "incomplete_pilot",
    });
  });

  it("fails closed when a reviewed candidate violates the market-zone contract", () => {
    const records: MarketZoneRecord[] = RABAT_MARKET_ZONES_CANARY.map((zone) => ({ ...zone }));
    records[0] = { ...records[0], areaKm2: 0 };
    assert.deepEqual(decideRabatMarketZonesGeoJson(records), {
      enabled: false,
      reason: "invalid_record",
    });
  });

  it("emits all four reviewed zones as explicitly non-official GeoJSON features", () => {
    const decision = decideRabatMarketZonesGeoJson(RABAT_MARKET_ZONES_CANARY);
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
