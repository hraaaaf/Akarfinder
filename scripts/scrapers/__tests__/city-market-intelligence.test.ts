import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateObservedDistrictMetrics,
  dedupeObservedMarketListings,
  metricValueForMode,
  type MarketDistrictTarget,
  type ObservedMarketListing,
} from "@/lib/map/city-market-intelligence";
import { buildCityMarketIntelligencePayload } from "@/lib/map/city-market-intelligence-payload";
import {
  MAP_LAYER_DENSITY,
  MAP_LAYER_EXPLORE,
  MAP_LAYER_LISTINGS,
  MAP_LAYER_PRICE,
  buildMapHref,
  mapLayerToIntelligenceMode,
  parseMapNavigationState,
  withMapLayer,
  withMapLocation,
} from "@/lib/map/map-navigation-state";

const targets: MarketDistrictTarget[] = [
  {
    districtSlug: "maarif",
    displayName: "Maârif",
    runtimeResolved: true,
    areaKm2: 2,
    areaBasis: "casablanca_osm_shadow",
  },
  {
    districtSlug: "finance-city",
    displayName: "Casablanca Finance City",
    runtimeResolved: true,
    areaKm2: null,
    areaBasis: null,
  },
  {
    districtSlug: "bouskoura",
    displayName: "Bouskoura",
    runtimeResolved: false,
    areaKm2: null,
    areaBasis: null,
  },
];

const rows: ObservedMarketListing[] = [
  {
    districtSlug: "maarif",
    transaction: "sale",
    canonicalKey: "https://example.test/a/",
    updatedAt: "2026-08-18T10:00:00Z",
    pricePerM2: 10_000,
    fresh: true,
    sourceDomain: "one.test",
  },
  {
    districtSlug: "maarif",
    transaction: "sale",
    canonicalKey: "https://example.test/a",
    updatedAt: "2026-08-18T11:00:00Z",
    pricePerM2: 12_000,
    fresh: true,
    sourceDomain: "one.test",
  },
  {
    districtSlug: "maarif",
    transaction: "sale",
    canonicalKey: "https://example.test/b",
    updatedAt: "2026-08-18T12:00:00Z",
    pricePerM2: 18_000,
    fresh: false,
    sourceDomain: "two.test",
  },
  {
    districtSlug: "finance-city",
    transaction: "sale",
    canonicalKey: "seed:3",
    updatedAt: "2026-08-18T09:00:00Z",
    pricePerM2: 20_000,
    fresh: true,
    sourceDomain: "three.test",
  },
];

test("Lot 9 deduplicates canonical listings before district aggregation", () => {
  const deduped = dedupeObservedMarketListings(rows);
  assert.equal(deduped.length, 3);
  assert.equal(deduped.find((row) => row.canonicalKey.includes("/a"))?.pricePerM2, 12_000);
});

test("Lot 9 derives price, volume and density from the same observed rows", () => {
  const metrics = aggregateObservedDistrictMetrics({
    targets,
    rows,
    snapshotVersion: "fixture-v1",
  });
  const maarif = metrics.find((row) => row.districtSlug === "maarif" && row.transactionType === "sale");
  assert.ok(maarif);
  assert.equal(maarif.listingCount, 2);
  assert.equal(maarif.medianPricePerM2Mad, 15_000);
  assert.equal(maarif.pricePerM2SampleCount, 2);
  assert.equal(maarif.observedListingDensityPerKm2, 1);
  assert.equal(metricValueForMode(maarif, "listings"), 2);
  assert.equal(metricValueForMode(maarif, "density"), 1);
});

test("Lot 9 fails closed for density when no admissible area exists", () => {
  const metrics = aggregateObservedDistrictMetrics({
    targets,
    rows,
    snapshotVersion: "fixture-v1",
  });
  const financeCity = metrics.find((row) => row.districtSlug === "finance-city" && row.transactionType === "sale");
  assert.ok(financeCity);
  assert.equal(financeCity.listingCount, 1);
  assert.equal(financeCity.observedListingDensityPerKm2, null);
});

test("Lot 9 distinguishes unresolved runtime geo entities from a true zero listing count", () => {
  const metrics = aggregateObservedDistrictMetrics({
    targets,
    rows,
    snapshotVersion: "fixture-v1",
  });
  const unresolved = metrics.find((row) => row.districtSlug === "bouskoura" && row.transactionType === "sale");
  assert.ok(unresolved);
  assert.equal(unresolved.runtimeResolved, false);
  assert.equal(unresolved.listingCount, null);
  assert.equal(unresolved.observedListingDensityPerKm2, null);
  assert.equal(unresolved.freshnessStatus, "unavailable");
});

test("Lot 9 payload keeps insufficient price neutral while volume remains factual", () => {
  const metrics = aggregateObservedDistrictMetrics({
    targets,
    rows,
    snapshotVersion: "fixture-v1",
  });
  const pricePayload = buildCityMarketIntelligencePayload({
    citySlug: "casablanca",
    cityDisplayName: "Casablanca",
    metrics,
    mode: "price",
    transaction: "sale",
  });
  const listingsPayload = buildCityMarketIntelligencePayload({
    citySlug: "casablanca",
    cityDisplayName: "Casablanca",
    metrics,
    mode: "listings",
    transaction: "sale",
  });
  assert.equal(pricePayload.districts.find((row) => row.districtSlug === "maarif")?.neutral, true);
  assert.equal(listingsPayload.districts.find((row) => row.districtSlug === "maarif")?.metricValue, 2);
  assert.equal(listingsPayload.legend.availableCount, 2);
});

test("Lot 9 persists price, density and listings in canonical map URLs", () => {
  const base = parseMapNavigationState({ city: "Casablanca", district: "Maarif", layer: "price" });
  assert.equal(base.layer, MAP_LAYER_PRICE);
  const density = withMapLayer(base, MAP_LAYER_DENSITY);
  const listings = withMapLayer(base, MAP_LAYER_LISTINGS);
  assert.match(buildMapHref(density), /layer=density/);
  assert.match(buildMapHref(listings), /layer=listings/);
  assert.equal(mapLayerToIntelligenceMode(density.layer), "density");
  assert.equal(mapLayerToIntelligenceMode(listings.layer), "listings");
});

test("Lot 9 does not silently change the legacy layer while moving between locations", () => {
  const explore = parseMapNavigationState({ layer: "explore" });
  assert.equal(explore.layer, MAP_LAYER_EXPLORE);
  const casablanca = withMapLocation(explore, "Casablanca");
  assert.equal(casablanca.city, "casablanca");
  assert.equal(casablanca.layer, MAP_LAYER_EXPLORE);
  const maarif = withMapLocation(casablanca, "Casablanca", "Maârif");
  assert.equal(maarif.district, "maarif");
  assert.equal(maarif.layer, MAP_LAYER_EXPLORE);
});
