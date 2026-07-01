import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  findMarketBenchmark,
  getMarketBenchmarkRegistry,
  listMarketBenchmarkEntries,
  normalizeMarketBenchmarkPropertyType,
} from "../../../lib/market/market-benchmark-registry";
import { calculatePriceGap } from "../../../lib/market/price-gap-calculator";

describe("market benchmark registry", () => {
  test("exposes Yakeey benchmark source policy", () => {
    const registry = getMarketBenchmarkRegistry();
    assert.equal(registry.benchmark_source, "yakeey");
    assert.equal(registry.source_type, "benchmark_source");
    assert.equal(registry.not_listing_source, true);
    assert.equal(registry.can_compute_market_benchmark, true);
    assert.equal(registry.can_compute_price_gap, true);
    assert.equal(registry.attribution_required, true);
  });

  test("normalizes property types", () => {
    assert.equal(normalizeMarketBenchmarkPropertyType("Appartement"), "appartement");
    assert.equal(normalizeMarketBenchmarkPropertyType("apartment"), "appartement");
    assert.equal(normalizeMarketBenchmarkPropertyType("Villa"), "villa");
    assert.equal(normalizeMarketBenchmarkPropertyType("Maison"), null);
  });

  test("matches city level benchmark", () => {
    const match = findMarketBenchmark({
      city: "Casablanca",
      property_type: "appartement",
    });

    assert.ok(match);
    assert.equal(match?.scope, "city");
    assert.equal(match?.city, "Casablanca");
    assert.equal(match?.property_type, "appartement");
    assert.ok(match?.benchmark_price_per_m2 && match.benchmark_price_per_m2 > 0);
  });

  test("matches neighborhood benchmark with accent normalization", () => {
    const match = findMarketBenchmark({
      city: "Casablanca",
      neighborhood: "Maârif",
      property_type: "villa",
    });

    assert.ok(match);
    assert.equal(match?.scope, "neighborhood");
    assert.equal(match?.neighborhood, "Maarif");
    assert.equal(match?.property_type, "villa");
  });

  test("falls back to city when neighborhood is absent", () => {
    const match = findMarketBenchmark({
      city: "Rabat",
      neighborhood: "Quartier Inconnu",
      property_type: "appartement",
    });

    assert.ok(match);
    assert.equal(match?.scope, "city");
    assert.equal(match?.city, "Rabat");
  });

  test("returns null for unsupported property types", () => {
    const match = findMarketBenchmark({
      city: "Casablanca",
      property_type: "bureau",
    });

    assert.equal(match, null);
  });

  test("registry contains benchmark entries", () => {
    const entries = listMarketBenchmarkEntries();
    assert.ok(entries.length > 0);
    assert.ok(entries.some((entry) => entry.city === "Casablanca" && entry.property_type === "appartement"));
    assert.ok(entries.some((entry) => entry.city === "Rabat" && entry.neighborhood === "Agdal"));
  });
});

describe("price gap calculator", () => {
  test("computes price per m2 and gap percent", () => {
    const result = calculatePriceGap({
      city: "Casablanca",
      property_type: "appartement",
      surface_m2: 100,
      total_price_mad: 800000,
    });

    assert.equal(result.benchmark_source, "yakeey");
    assert.equal(result.price_per_m2, 8000);
    assert.equal(result.benchmark_price_per_m2, 7054);
    assert.equal(result.price_gap_percent, 13.4);
    assert.equal(result.price_position, "near_market");
  });

  test("classifies below market", () => {
    const result = calculatePriceGap({
      city: "Casablanca",
      property_type: "appartement",
      surface_m2: 100,
      total_price_mad: 550000,
    });

    assert.equal(result.price_position, "below_market");
    assert.ok(result.price_gap_percent !== null && result.price_gap_percent <= -15);
  });

  test("classifies near market", () => {
    const result = calculatePriceGap({
      city: "Casablanca",
      neighborhood: "Maarif",
      property_type: "villa",
      surface_m2: 100,
      total_price_mad: 1120000,
    });

    assert.equal(result.price_position, "near_market");
    assert.ok(result.price_gap_percent !== null && result.price_gap_percent > -15);
    assert.ok(result.price_gap_percent !== null && result.price_gap_percent < 15);
  });

  test("classifies above market", () => {
    const result = calculatePriceGap({
      city: "Rabat",
      neighborhood: "Agdal",
      property_type: "villa",
      surface_m2: 100,
      total_price_mad: 1800000,
    });

    assert.equal(result.price_position, "above_market");
    assert.ok(result.price_gap_percent !== null && result.price_gap_percent >= 15);
    assert.ok(result.price_gap_percent !== null && result.price_gap_percent < 30);
  });

  test("classifies overpriced", () => {
    const result = calculatePriceGap({
      city: "Rabat",
      neighborhood: "Agdal",
      property_type: "villa",
      surface_m2: 100,
      total_price_mad: 2200000,
    });

    assert.equal(result.price_position, "overpriced");
    assert.ok(result.price_gap_percent !== null && result.price_gap_percent >= 30);
  });

  test("returns insufficient data when neighborhood is absent and city is unknown", () => {
    const result = calculatePriceGap({
      city: "Ville inconnue",
      property_type: "appartement",
      surface_m2: 100,
      total_price_mad: 500000,
    });

    assert.equal(result.price_position, "insufficient_data");
    assert.equal(result.benchmark_price_per_m2, null);
  });

  test("returns insufficient data when surface is missing", () => {
    const result = calculatePriceGap({
      city: "Casablanca",
      property_type: "appartement",
      total_price_mad: 500000,
    });

    assert.equal(result.price_position, "insufficient_data");
    assert.equal(result.price_per_m2, null);
  });

  test("returns insufficient data when total price is missing", () => {
    const result = calculatePriceGap({
      city: "Casablanca",
      property_type: "appartement",
      surface_m2: 100,
    });

    assert.equal(result.price_position, "insufficient_data");
    assert.equal(result.price_per_m2, null);
  });

  test("falls back to city benchmark when quartier is missing", () => {
    const result = calculatePriceGap({
      city: "Casablanca",
      property_type: "villa",
      surface_m2: 100,
      total_price_mad: 1400000,
    });

    assert.equal(result.benchmark_scope, "city");
    assert.equal(result.benchmark_city, "Casablanca");
  });
});
