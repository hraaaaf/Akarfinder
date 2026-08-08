import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { getNeighborhoodsByCity } from "../../../lib/map/canonical-neighborhood-data";
import {
  getExactApartmentBuyBenchmark,
  getExactApartmentBuyBenchmarks,
  marketPriceLayerUsesInterpolation,
} from "../../../lib/map/akarfinder-market-intelligence";
import {
  buildMapHref,
  MAP_LAYER_PRICE,
  parseMapNavigationState,
  withMapLayer,
} from "../../../lib/map/map-navigation-state";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("P1B.2 — Territorial intelligence", () => {
  it("exposes price as a canonical URL-backed map layer", () => {
    const parsed = parseMapNavigationState({ city: "Casablanca", layer: "price" });
    assert.equal(parsed.city, "casablanca");
    assert.equal(parsed.layer, MAP_LAYER_PRICE);
    assert.equal(buildMapHref(parsed), "/map?city=casablanca&layer=price");
    assert.equal(withMapLayer(parseMapNavigationState({}), MAP_LAYER_PRICE).layer, "explore");
  });

  it("uses exact neighborhood apartment-buy observations only", () => {
    const casablanca = getNeighborhoodsByCity("Casablanca");
    const benchmarks = getExactApartmentBuyBenchmarks(casablanca);
    assert.deepEqual(benchmarks.map((entry) => entry.neighborhood).sort(), ["Casablanca Finance City", "Maârif"]);
    assert.equal(benchmarks.find((entry) => entry.neighborhood === "Casablanca Finance City")?.medianPricePerM2, 15000);
    assert.equal(benchmarks.find((entry) => entry.neighborhood === "Maârif")?.sampleCount, 58);
    assert.equal(getExactApartmentBuyBenchmark(casablanca.find((point) => point.neighborhood === "Bouskoura")!), null);
  });

  it("never interpolates point prices into territorial polygons", () => {
    assert.equal(marketPriceLayerUsesInterpolation(), false);
    const intelligence = source("lib/map/akarfinder-market-intelligence.ts");
    const map = source("components/map/MapNeighborhoodExperience.tsx");
    assert.ok(intelligence.includes("entry.neighborhood !== undefined"));
    assert.ok(intelligence.includes("resolveNeighborhoodEntity"));
    assert.ok(!map.toLowerCase().includes("heatmap"));
    assert.ok(map.includes("Aucune interpolation sur les zones"));
  });

  it("shows range, sample size, confidence and period on exact price markers", () => {
    const map = source("components/map/MapNeighborhoodExperience.tsx");
    assert.ok(map.includes("formatPriceRange"));
    assert.ok(map.includes("sampleCount"));
    assert.ok(map.includes("exactBenchmark.confidence"));
    assert.ok(map.includes("exactBenchmark?.period"));
    assert.ok(map.includes('el.dataset.akarfinderMarketMarker = priceMode ? "exact-price"'));
  });

  it("anchors price markers toward the map interior to prevent mobile edge clipping", () => {
    const map = source("components/map/MapNeighborhoodExperience.tsx");
    assert.ok(map.includes('anchor: priceMode ? (point.lng <= map.getCenter().lng ? "left" : "right") : "center"'));
  });

  it("keeps territory colors non-semantic while price mode lowers their emphasis", () => {
    const map = source("components/map/MapNeighborhoodExperience.tsx");
    const territorial = source("lib/map/akarfinder-territorial-style.ts");
    assert.ok(territorial.includes("territorialColorsAreSemanticScores(): false"));
    assert.ok(map.includes("priceMode ? (theme === \"dark\" ? 0.14 : 0.18)"));
  });
});
