import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  projectPartnerMarketDownstreamV2,
  projectPartnerMarketSnapshotDownstreamV2,
} from "../../../lib/market/partner-market-downstream-v2.js";
import type {
  PartnerMarketMetricDeltaV2,
  PartnerMarketMetricRowV2,
} from "../../../lib/market/partner-market-aggregator-v2.js";

function row(overrides: Partial<PartnerMarketMetricRowV2> = {}): PartnerMarketMetricRowV2 {
  return {
    canonical_neighborhood_id: "district_casablanca_maarif",
    city: "Casablanca",
    neighborhood: "Maârif",
    transaction_type: "sale",
    listing_count: 12,
    categories: { apartment: 10, villa: 2 },
    price_sample_count: 8,
    median_price_per_m2_mad: 14_500,
    price_reliability: "limited",
    fresh_listing_percent: 75,
    freshness_status: "mixed",
    source_count: 3,
    area_km2: 2,
    area_certified: true,
    area_source_ref: "geometry:maarif:v1",
    listing_density_km2: 6,
    benchmarks: { apartment: null, villa: null },
    market_representativeness: "uncertified",
    snapshot_version: "snap-p5",
    snapshot_at: "2026-08-24T12:00:00.000Z",
    provenance: ["partner-market-v2"],
    ...overrides,
  };
}

function delta(overrides: Partial<PartnerMarketMetricDeltaV2> = {}): PartnerMarketMetricDeltaV2 {
  return {
    canonical_neighborhood_id: "district_casablanca_maarif",
    transaction_type: "sale",
    listing_count_delta: 2,
    median_price_per_m2_delta: 500,
    listing_density_km2_delta: 1,
    previous_snapshot_version: "snap-p4",
    current_snapshot_version: "snap-p5",
    ...overrides,
  };
}

describe("Partner Market Downstream V2", () => {
  it("projects one canonical truth to Search, Map and neighborhood card", () => {
    const projection = projectPartnerMarketDownstreamV2({
      row: row(),
      delta: delta(),
      map_runtime_resolved_neighborhood_ids: new Set(["district_casablanca_maarif"]),
    });

    assert.equal(projection.activation_status, "full_downstream");
    assert.equal(projection.canonical_neighborhood_id, "district_casablanca_maarif");
    assert.equal(projection.search.city, "Casablanca");
    assert.equal(projection.search.district, "Maârif");
    assert.match(projection.search.href, /^\/search\?/);
    assert.equal(projection.map.canonicalNeighborhoodId, projection.canonical_neighborhood_id);
    assert.equal(projection.map.districtSlug, "maarif");
    assert.equal(projection.map.runtimeResolved, true);
    assert.equal(projection.map.listingCount, 12);
    assert.equal(projection.map.medianPricePerM2Mad, 14_500);
    assert.equal(projection.map.observedListingDensityPerKm2, 6);
    assert.equal(projection.neighborhood_card.canonical_neighborhood_id, projection.canonical_neighborhood_id);
    assert.equal(projection.neighborhood_card.trend?.listing_count_delta, 2);
  });

  it("keeps national N2 rows useful for Search/card while Map fails closed without runtime geometry proof", () => {
    const projection = projectPartnerMarketDownstreamV2({
      row: row({
        canonical_neighborhood_id: "national_n2:casablanca:quartier-source",
        neighborhood: "Quartier Source",
      }),
      map_runtime_resolved_neighborhood_ids: new Set(),
    });

    assert.equal(projection.activation_status, "search_card_only");
    assert.equal(projection.search.district, "Quartier Source");
    assert.equal(projection.map.runtimeResolved, false);
    assert.equal(projection.map.districtSlug, "quartier-source");
    assert.equal(projection.neighborhood_card.neighborhood, "Quartier Source");
  });

  it("never exposes density when area certification is absent", () => {
    const projection = projectPartnerMarketDownstreamV2({
      row: row({
        area_certified: false,
        area_km2: 2,
        area_source_ref: "untrusted-area",
        listing_density_km2: 999,
      }),
      map_runtime_resolved_neighborhood_ids: new Set(["district_casablanca_maarif"]),
    });

    assert.equal(projection.map.areaKm2, null);
    assert.equal(projection.map.areaSourceRef, null);
    assert.equal(projection.map.observedListingDensityPerKm2, null);
    assert.equal(projection.neighborhood_card.area_certified, false);
    assert.equal(projection.neighborhood_card.listing_density_km2, null);
  });

  it("does not invent a trend from a mismatched history row", () => {
    const projection = projectPartnerMarketDownstreamV2({
      row: row(),
      delta: delta({ canonical_neighborhood_id: "district_rabat_agdal" }),
    });
    assert.equal(projection.neighborhood_card.trend, null);
  });

  it("projects an entire snapshot deterministically using the exact matching delta", () => {
    const projections = projectPartnerMarketSnapshotDownstreamV2({
      rows: [row(), row({ transaction_type: "rent", snapshot_version: "snap-rent" })],
      deltas: [delta()],
      map_runtime_resolved_neighborhood_ids: new Set(["district_casablanca_maarif"]),
    });

    assert.equal(projections.length, 2);
    assert.equal(projections[0].neighborhood_card.trend?.previous_snapshot_version, "snap-p4");
    assert.equal(projections[1].neighborhood_card.trend, null);
    assert.equal(projections[1].search.transaction_type, "rent");
  });
});
