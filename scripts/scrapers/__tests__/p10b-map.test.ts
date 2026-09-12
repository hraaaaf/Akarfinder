import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { geoEnrichedMockListings } from "@/lib/listings/mock-listings";
import type { Listing } from "@/lib/listings/types";
import {
  defaultMapFilters,
  filterMapListings,
  getMapClusters,
  getMapPoints,
  getMapSearchHref,
  isExactMapListing,
} from "@/lib/map/listing-map";
import {
  NEIGHBORHOOD_POINTS,
  filterNeighborhoodsByCity,
  getBenchmarkLabel,
  getNeighborhoodCities,
} from "@/lib/map/neighborhood-data";

// NOTE: As of MAP-NEIGHBORHOOD-INTELLIGENCE-1, the /map page uses neighborhood-data.ts
// and no longer uses filterMapListings or MapFilters for its UI.
// These helpers are preserved here for backward compatibility only, but must stay fail-closed.

const exactListing: Listing = {
  ...geoEnrichedMockListings[0],
  id: "exact-map-proof",
  latitude: 33.585,
  longitude: -7.632,
  geo_precision: "exact",
  geo_source: "manual_import",
};

describe("P10B - map helpers (listing-based, preserved for compat)", () => {
  it("fails closed on centroid-enriched listings", () => {
    const listings = filterMapListings(geoEnrichedMockListings, {
      ...defaultMapFilters,
      hideDuplicates: false,
    });

    assert.equal(listings.length, 0);
    assert.ok(geoEnrichedMockListings.some((listing) => listing.geo_precision === "neighborhood_centroid"));
    assert.ok(geoEnrichedMockListings.every((listing) => isExactMapListing(listing) === false));
  });

  it("accepts only exact coordinates with traceable exact provenance", () => {
    assert.equal(isExactMapListing(exactListing), true);
    assert.equal(isExactMapListing({ ...exactListing, geo_source: "unknown" }), false);
    assert.equal(isExactMapListing({ ...exactListing, geo_precision: "city_centroid" }), false);
    assert.equal(isExactMapListing({ ...exactListing, latitude: 999 }), false);
    assert.equal(isExactMapListing({ ...exactListing, longitude: Number.NaN }), false);
  });

  it("can hide likely duplicates without deleting source data", () => {
    const duplicateLike: Listing = {
      ...exactListing,
      id: "duplicate-like-listing",
      duplicate_score: 0.82,
    };

    const listings = filterMapListings([exactListing, duplicateLike], {
      ...defaultMapFilters,
      hideDuplicates: true,
    });

    assert.deepEqual(listings.map((listing) => listing.id), [exactListing.id]);
  });

  it("projects map points only from real exact coordinates", () => {
    const points = getMapPoints([...geoEnrichedMockListings, exactListing]);

    assert.equal(points.length, 1);
    assert.equal(points[0]?.listing.id, exactListing.id);
    assert.equal(points[0]?.precisionLabel, "Position exacte");
    assert.ok(points.every((point) => point.x >= 8 && point.x <= 92));
    assert.ok(points.every((point) => point.y >= 8 && point.y <= 92));
  });

  it("builds city clusters only from exact listings and keeps search handoff URLs", () => {
    const clusters = getMapClusters([...geoEnrichedMockListings, exactListing]);
    const href = getMapSearchHref({
      ...defaultMapFilters,
      city: "Casablanca",
      transactionType: "buy",
    });

    assert.equal(clusters.length, 1);
    assert.equal(clusters[0]?.city, "Casablanca");
    assert.equal(clusters[0]?.count, 1);
    assert.match(href, /^\/search\?/);
    assert.match(href, /city=Casablanca/);
    assert.match(href, /type=buy/);
  });
});

describe("MAP-NEIGHBORHOOD-INTELLIGENCE-1 - neighborhood map contract", () => {
  const mapPageSource = fs.readFileSync(path.join(process.cwd(), "app/map/page.tsx"), "utf8");
  const neighborhoodSource = fs.readFileSync(
    path.join(process.cwd(), "lib/map/neighborhood-data.ts"),
    "utf8"
  );
  const neighborhoodExperienceSource = fs.readFileSync(
    path.join(process.cwd(), "components/map/MapNeighborhoodExperience.tsx"),
    "utf8"
  );

  it("/map ne reference ni searchListings ni applyGeoEnrichment", () => {
    assert.equal(mapPageSource.includes("searchListings"), false);
    assert.equal(mapPageSource.includes("applyGeoEnrichment"), false);
  });

  it("/map n'utilise plus de contrat listings legacy", () => {
    assert.equal(neighborhoodExperienceSource.includes("/listings/"), false);
    assert.equal(neighborhoodExperienceSource.includes("annonces analysées"), false);
    assert.equal(neighborhoodExperienceSource.includes("biens analysés"), false);
    assert.equal(neighborhoodExperienceSource.includes("densité d'annonces"), false);
    assert.equal(neighborhoodExperienceSource.includes("clusters d'annonces"), false);
  });

  it("neighborhood-data expose villes, quartiers et repères sûrs", () => {
    assert.ok(getNeighborhoodCities().length > 0);
    assert.ok(NEIGHBORHOOD_POINTS.some((point) => point.neighborhood != null));
    assert.ok(
      NEIGHBORHOOD_POINTS.every((point) =>
        point.searchHref.startsWith("/search?")
      )
    );
    assert.ok(
      filterNeighborhoodsByCity("Casablanca").some(
        (point) => point.neighborhood === "Maârif"
      )
    );
    assert.ok(
      filterNeighborhoodsByCity("Marrakech").some(
        (point) => point.neighborhood === "Guéliz"
      )
    );
  });

  it("searchHref and labels are encoded and non-invented", () => {
    const maarif = NEIGHBORHOOD_POINTS.find(
      (point) => point.neighborhood === "Maârif"
    );
    assert.ok(maarif);
    assert.match(getBenchmarkLabel(maarif!), /^~\d[\d\s]* DH\/m²$/);

    const ourika = NEIGHBORHOOD_POINTS.find(
      (point) => point.neighborhood === "Route de l'Ourika"
    );
    assert.ok(ourika);
    assert.equal(
      ourika?.searchHref,
      "/search?city=Marrakech&district=Route+de+l%27Ourika"
    );
    assert.match(getBenchmarkLabel(ourika!), /^~\d[\d\s]* DH\/m²$/);
  });

  it("MapNeighborhoodExperience contains markers and detail panel code paths", () => {
    assert.ok(neighborhoodExperienceSource.includes("createNeighborhoodMarkerEl"));
    assert.ok(neighborhoodExperienceSource.includes("NeighborhoodPanel"));
    assert.ok(neighborhoodExperienceSource.includes("Rechercher dans ce quartier"));
  });

  it("no forbidden wording appears in the map neighborhood experience", () => {
    const forbidden = [
      "annonces analysées",
      "biens analysés",
      "sources analysées",
      "données analysées",
      "index AkarFinder",
      "densité d'annonces",
      "clusters d'annonces",
      "fiabilité moyenne des annonces",
    ];

    for (const word of forbidden) {
      assert.equal(neighborhoodExperienceSource.includes(word), false, word);
      assert.equal(neighborhoodSource.includes(word), false, word);
    }
    assert.equal(mapPageSource.includes("minReliabilityScore"), false);
  });

  it("reliability_score global still exists outside /map", () => {
    const listingTypesSource = fs.readFileSync(
      path.join(process.cwd(), "lib/listings/types.ts"),
      "utf8"
    );
    assert.equal(listingTypesSource.includes("reliability_score"), true);
  });
});
