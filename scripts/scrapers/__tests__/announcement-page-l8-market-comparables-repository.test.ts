import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assembleMarketComparableCandidates,
  comparablePropertyTypeForDb,
  comparableTransactionForDb,
} from "@/lib/property-detail/market-comparables-repository";

describe("ANN-L8 Market Index comparable reader", () => {
  it("maps public property/transaction values to canonical DB filters", () => {
    assert.equal(comparablePropertyTypeForDb("Appartement"), "apartment");
    assert.equal(comparablePropertyTypeForDb("Bureau"), "office");
    assert.equal(comparablePropertyTypeForDb("Inconnu"), null);
    assert.equal(comparableTransactionForDb("buy"), "sale");
    assert.equal(comparableTransactionForDb("rent"), "rent");
    assert.equal(comparableTransactionForDb("new"), "new");
  });

  it("assembles a verified candidate from cluster membership, source attribution and latest observation", () => {
    const result = assembleMarketComparableCandidates({
      listings: [{ id: 42, city: "Rabat", district: "Agdal", property_type: "apartment", transaction_type: "sale" }],
      clusters: [{ id: "cluster-42", cluster_origin: "manual_review", legacy_property_listing_id: 42 }],
      members: [
        { property_cluster_id: "cluster-42", source_offer_id: 10 },
        { property_cluster_id: "cluster-42", source_offer_id: 11 },
      ],
      sources: [
        { id: 10, source_name: "Source B" },
        { id: 11, source_name: "Source A" },
      ],
      observations: [
        { source_offer_id: 10, observed_at: "2026-07-01T00:00:00Z", displayed_price: 1_800_000, surface_m2: 95 },
        { source_offer_id: 10, observed_at: "2026-08-01T00:00:00Z", displayed_price: 1_900_000, surface_m2: 98 },
        { source_offer_id: 11, observed_at: "2026-07-20T00:00:00Z", displayed_price: 1_850_000, surface_m2: 97 },
      ],
    });

    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      listingId: "42",
      propertyClusterId: "cluster-42",
      clusterVerified: true,
      city: "Rabat",
      neighborhood: "Agdal",
      propertyType: "Appartement",
      transactionType: "buy",
      displayedPriceMad: 1_900_000,
      surfaceM2: 98,
      observedAt: "2026-08-01T00:00:00Z",
      sourceCount: 2,
      sourceAttribution: ["Source A", "Source B"],
    });
  });

  it("refuses unknown cluster origins, missing members and clusters without observations", () => {
    const listings = [
      { id: 1, city: "Rabat", district: "Agdal", property_type: "apartment", transaction_type: "sale" },
      { id: 2, city: "Rabat", district: "Agdal", property_type: "apartment", transaction_type: "sale" },
      { id: 3, city: "Rabat", district: "Agdal", property_type: "apartment", transaction_type: "sale" },
    ];
    const result = assembleMarketComparableCandidates({
      listings,
      clusters: [
        { id: "bad-origin", cluster_origin: "heuristic_guess", legacy_property_listing_id: 1 },
        { id: "no-member", cluster_origin: "manual_review", legacy_property_listing_id: 2 },
        { id: "no-observation", cluster_origin: "manual_review", legacy_property_listing_id: 3 },
      ],
      members: [{ property_cluster_id: "no-observation", source_offer_id: 30 }],
      sources: [{ id: 30, source_name: "Source A" }],
      observations: [],
    });
    assert.deepEqual(result, []);
  });

  it("keeps a candidate fail-closed when all source attributions are empty", () => {
    const result = assembleMarketComparableCandidates({
      listings: [{ id: 7, city: "Rabat", district: "Agdal", property_type: "apartment", transaction_type: "sale" }],
      clusters: [{ id: "cluster-7", cluster_origin: "legacy_one_to_one_projection", legacy_property_listing_id: 7 }],
      members: [{ property_cluster_id: "cluster-7", source_offer_id: 70 }],
      sources: [{ id: 70, source_name: null }],
      observations: [{ source_offer_id: 70, observed_at: "2026-08-01T00:00:00Z", displayed_price: 1_500_000, surface_m2: 90 }],
    });
    assert.equal(result.length, 1);
    assert.equal(result[0]?.sourceCount, 0);
    assert.deepEqual(result[0]?.sourceAttribution, []);
  });
});
