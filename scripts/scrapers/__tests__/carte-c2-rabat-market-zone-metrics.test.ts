import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMarketZoneMetricRow } from "@/lib/map/rabat-market-zone-metrics";
import { RABAT_MARKET_ZONES_SHADOW } from "@/lib/geo/rabat-market-zones-shadow";

describe("Carte C2 Rabat market-zone metrics", () => {
  it("computes density only from positive certified area", () => {
    const row = buildMarketZoneMetricRow({
      zoneId: "z", displayName: "Z", transactionType: "sale",
      areaKm2: 2, listingCount: 25, pricePerM2SampleCount: 5, medianPricePerM2Mad: 18000,
    });
    assert.equal(row.observedListingDensityPerKm2, 12.5);
    assert.equal(buildMarketZoneMetricRow({ ...row, areaKm2: 0 }).observedListingDensityPerKm2, null);
  });

  it("keeps missing price distinct from zero", () => {
    const row = buildMarketZoneMetricRow({
      zoneId: "z", displayName: "Z", transactionType: "rent",
      areaKm2: 5, listingCount: 0, pricePerM2SampleCount: 0, medianPricePerM2Mad: null,
    });
    assert.equal(row.medianPricePerM2Mad, null);
    assert.equal(row.observedListingDensityPerKm2, 0);
  });

  it("uses the four certified C1 Shadow zones with positive area", () => {
    assert.equal(RABAT_MARKET_ZONES_SHADOW.length, 4);
    for (const zone of RABAT_MARKET_ZONES_SHADOW) {
      assert.equal(zone.semanticType, "market_zone");
      assert.equal(zone.officialBoundary, false);
      assert.equal(zone.publicationStatus, "shadow");
      assert.ok(zone.areaKm2 > 0);
    }
  });
});
