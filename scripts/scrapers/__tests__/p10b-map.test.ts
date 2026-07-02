import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { geoEnrichedMockListings } from "@/lib/listings/mock-listings";
import {
  defaultMapFilters,
  filterMapListings,
  getMapClusters,
  getMapPoints,
  getMapSearchHref,
} from "@/lib/map/listing-map";
import {
  NEIGHBORHOOD_POINTS,
  filterNeighborhoodsByCity,
  getBenchmarkLabel,
  getNeighborhoodCities,
} from "@/lib/map/neighborhood-data";

// NOTE: As of MAP-NEIGHBORHOOD-INTELLIGENCE-1, the /map page uses neighborhood-data.ts
// and no longer uses filterMapListings or MapFilters for its UI.
// These helpers are preserved here for backward compatibility only.

describe("P10B - map helpers (listing-based, preserved for compat)", () => {
  it("keeps only listings with geo coordinates", () => {
    const listings = filterMapListings(geoEnrichedMockListings, {
      ...defaultMapFilters,
      hideDuplicates: false,
    });

    assert.ok(listings.length > 0);
    assert.ok(
      listings.every(
        (listing) =>
          listing.latitude != null &&
          listing.longitude != null
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
    });

    assert.ok(clusters.some((cluster) => cluster.city === "Casablanca"));
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
    assert.equal(neighborhoodExperienceSource.includes("annonces analysÃ©es"), false);
    assert.equal(neighborhoodExperienceSource.includes("biens analysÃ©s"), false);
    assert.equal(neighborhoodExperienceSource.includes("densitÃ© d'annonces"), false);
    assert.equal(neighborhoodExperienceSource.includes("clusters d'annonces"), false);
  });

  it("neighborhood-data expose villes, quartiers et repÃ¨res sÃ»rs", () => {
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
    assert.equal(ourika?.searchHref, "/search?city=Marrakech&q=Ourika");
    assert.match(getBenchmarkLabel(ourika!), /^~\d[\d\s]* DH\/m²$/);
  });

  it("MapNeighborhoodExperience contains markers and detail panel code paths", () => {
    assert.ok(neighborhoodExperienceSource.includes("createNeighborhoodMarkerEl"));
    assert.ok(neighborhoodExperienceSource.includes("NeighborhoodPanel"));
    assert.ok(neighborhoodExperienceSource.includes("Rechercher dans ce quartier"));
  });

  it("no forbidden wording appears in the map neighborhood experience", () => {
    const forbidden = [
      "annonces analysÃ©es",
      "biens analysÃ©s",
      "sources analysÃ©es",
      "donnÃ©es analysÃ©es",
      "index AkarFinder",
      "densitÃ© d'annonces",
      "clusters d'annonces",
      "fiabilitÃ© moyenne des annonces",
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


