import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { geoEnrichedMockListings } from "@/lib/listings/mock-listings";
import {
  defaultMapFilters,
  filterMapListings,
  getMapClusters,
  getMapPoints,
  getMapSearchHref,
} from "@/lib/map/listing-map";

describe("P10B - map MVP helpers", () => {
  it("keeps only listings with geo coordinates and the configured reliability floor", () => {
    const listings = filterMapListings(geoEnrichedMockListings, {
      ...defaultMapFilters,
      minReliabilityScore: 80,
      hideDuplicates: false,
    });

    assert.ok(listings.length > 0);
    assert.ok(
      listings.every(
        (listing) =>
          listing.latitude != null &&
          listing.longitude != null &&
          listing.reliability_score >= 80
      )
    );
  });

  it("can hide likely duplicates without deleting source data", () => {
    const duplicateLike = {
      ...geoEnrichedMockListings[0],
      id: "duplicate-like-listing",
      duplicate_score: 0.82,
    };

    const listings = filterMapListings([...geoEnrichedMockListings, duplicateLike], {
      ...defaultMapFilters,
      hideDuplicates: true,
      minReliabilityScore: 0,
    });

    assert.equal(
      listings.some((listing) => listing.id === duplicateLike.id),
      false
    );
  });

  it("projects map points inside the controlled Morocco visual area", () => {
    const points = getMapPoints(geoEnrichedMockListings);

    assert.ok(points.length > 0);
    assert.ok(points.every((point) => point.x >= 8 && point.x <= 92));
    assert.ok(points.every((point) => point.y >= 8 && point.y <= 92));
  });

  it("builds city clusters and search handoff URLs", () => {
    const clusters = getMapClusters(geoEnrichedMockListings);
    const href = getMapSearchHref({
      ...defaultMapFilters,
      city: "Casablanca",
      transactionType: "buy",
      minReliabilityScore: 70,
    });

    assert.ok(clusters.some((cluster) => cluster.city === "Casablanca"));
    assert.match(href, /^\/search\?/);
    assert.match(href, /city=Casablanca/);
    assert.match(href, /type=buy/);
    assert.match(href, /minReliabilityScore=70/);
  });
});
