import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { decorateGeometryWithMarketIntelligence } from "../../../lib/map/city-market-heatmap";
import type { CityMarketIntelligencePayload } from "../../../lib/map/city-market-intelligence-payload";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function payload(): CityMarketIntelligencePayload {
  return {
    city: { slug: "casablanca", displayName: "Casablanca" },
    mode: "listings",
    transaction: "sale",
    observedMarketOnly: true,
    scaleMethod: "snapshot_quantiles_v1",
    legend: {
      availableCount: 1,
      classCount: 1,
      thresholds: [],
      min: 4,
      max: 4,
      colors: ["#2457D6"],
      neutralColor: "#D8E1E8",
    },
    districts: [
      {
        districtSlug: "maarif",
        displayName: "Maârif",
        mode: "listings",
        transaction: "sale",
        metricValue: 4,
        metricUnit: "annonces",
        sampleCount: 4,
        reliability: null,
        runtimeResolved: true,
        neutral: false,
        classIndex: 0,
        fillColor: "#2457D6",
        freshnessStatus: "fresh_confirmed",
        snapshotVersion: "test",
        areaKm2: 3.2,
        areaBasis: "casablanca_osm_shadow",
        marketMetrics: {
          priceMedianMadM2: null,
          priceSampleCount: 0,
          priceReliability: "insufficient",
          listingCount: 4,
          listingDensityKm2: 1.25,
        },
      },
    ],
  };
}

describe("Carte Lot 10 — semantic market heatmap", () => {
  it("joins observed market metrics to geometry by canonical district slug", () => {
    const geometry: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { cityCanonicalId: "casablanca", neighborhoodCanonicalId: "maarif", displayName: "Maârif" },
          geometry: { type: "Polygon", coordinates: [[[-7.65, 33.58], [-7.63, 33.58], [-7.63, 33.6], [-7.65, 33.58]]] },
        },
      ],
    };
    const result = decorateGeometryWithMarketIntelligence(geometry, payload());
    assert.equal(result.features[0]?.properties?.marketMetricValue, 4);
    assert.equal(result.features[0]?.properties?.marketFillColor, "#2457D6");
    assert.equal(result.features[0]?.properties?.marketNeutral, false);
    assert.equal(result.features[0]?.properties?.marketSampleCount, 4);
  });

  it("keeps unmatched polygons neutral instead of fabricating a value", () => {
    const geometry: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { cityCanonicalId: "casablanca", neighborhoodCanonicalId: "anfa", displayName: "Anfa" },
          geometry: { type: "Polygon", coordinates: [[[-7.7, 33.58], [-7.68, 33.58], [-7.68, 33.6], [-7.7, 33.58]]] },
        },
      ],
    };
    const result = decorateGeometryWithMarketIntelligence(geometry, payload());
    assert.equal(result.features[0]?.properties?.marketMetricValue, null);
    assert.equal(result.features[0]?.properties?.marketFillColor, "#D8E1E8");
    assert.equal(result.features[0]?.properties?.marketNeutral, true);
    assert.equal(result.features[0]?.properties?.marketSampleCount, 0);
  });

  it("bridges the three Lot 9 modes to the real Casablanca MapLibre source", () => {
    const style = source("lib/map/akarfinder-territorial-style.ts");
    const legend = source("components/map/MapLegend.tsx");
    assert.match(style, /AKARFINDER_MARKET_MODE_EVENT/);
    assert.match(style, /\/api\/geo\/market-intelligence\?city=casablanca&mode=/);
    assert.match(style, /source\?\.setData\(decorated\)/);
    assert.match(style, /marketNeutral/);
    assert.match(style, /AKARFINDER_TERRITORIAL_SELECT_EVENT/);
    assert.match(legend, /window\.dispatchEvent\(new CustomEvent\(AKARFINDER_MARKET_MODE_EVENT/);
    assert.match(legend, /window\.addEventListener\(AKARFINDER_TERRITORIAL_SELECT_EVENT/);
    assert.match(legend, /withMapLocation\(navigationState, detail\.city, detail\.district\)/);
  });

  it("fails closed to a neutral heatmap when market data cannot be loaded", () => {
    const style = source("lib/map/akarfinder-territorial-style.ts");
    assert.match(style, /DEFAULT_NEUTRAL_HEATMAP/);
    assert.match(style, /market-heatmap/);
    assert.match(style, /fill-color\", DEFAULT_NEUTRAL_HEATMAP/);
  });

  it("uses a visible mid-palette tone when only one semantic class exists", () => {
    const rabatPayload = source("lib/map/intelligence-payload.ts");
    const cityPayload = source("lib/map/city-market-intelligence-payload.ts");
    const rule = "if (classCount === 1) return [palette[Math.min(2, palette.length - 1)]];";
    assert.ok(rabatPayload.includes(rule));
    assert.ok(cityPayload.includes(rule));
  });

  it("lets semantic market modes own the district exploration surface", () => {
    const explorer = source("components/map/TerritorialExplorer.tsx");
    assert.ok(explorer.includes("if (navigationState.layer !== MAP_LAYER_EXPLORE) return null;"));
  });
});
