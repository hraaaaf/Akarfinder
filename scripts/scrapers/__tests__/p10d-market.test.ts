// P10D tests — Prix moyen observé
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getMarketReference, getListingObservedPriceComparison } from "../../../lib/market/get-market-reference";

describe("P10D - getMarketReference", () => {
  it("returns neighborhood-level data for Casablanca Finance City appartement buy", () => {
    const ref = getMarketReference("Casablanca", "Finance City", "Appartement", "buy", 15000);
    assert.ok(ref !== null, "should return data");
    assert.equal(ref.scope, "neighborhood");
    assert.ok(ref.median_price_per_m2 > 0);
    assert.ok(ref.sample_count > 0);
    assert.ok(["élevée", "moyenne", "faible"].includes(ref.confidence));
  });

  it("returns city-level fallback when neighborhood not covered", () => {
    const ref = getMarketReference("Casablanca", "Quartier Inconnu", "Appartement", "buy", 13000);
    assert.ok(ref !== null, "should fall back to city level");
    assert.equal(ref.scope, "city");
  });

  it("returns null for unknown city", () => {
    const ref = getMarketReference("Ville Inconnue", "Quartier X", "Appartement", "buy", 10000);
    assert.equal(ref, null);
  });

  it("computes position=coherent when listing price is within 10% of median", () => {
    const ref = getMarketReference("Casablanca", "Maârif", "Appartement", "buy", 14200);
    assert.ok(ref !== null);
    assert.equal(ref.position, "coherent");
  });

  it("computes position=high when listing price is >10% above median", () => {
    const ref = getMarketReference("Casablanca", "Maârif", "Appartement", "buy", 16000);
    assert.ok(ref !== null);
    assert.equal(ref.position, "high");
    assert.ok(ref.position_pct > 10);
  });

  it("computes position=low when listing price is >10% below median", () => {
    const ref = getMarketReference("Casablanca", "Maârif", "Appartement", "buy", 11000);
    assert.ok(ref !== null);
    assert.equal(ref.position, "low");
    assert.ok(ref.position_pct < -10);
  });

  it("handles accent normalization: Fès == fes", () => {
    const ref = getMarketReference("Fès", undefined, "Appartement", "buy", 9000);
    assert.ok(ref !== null, "should handle accents in city name");
  });

  it("handles rent transaction type", () => {
    const ref = getMarketReference("Rabat", "Agdal", "Appartement", "rent", 120);
    assert.ok(ref !== null);
    assert.equal(ref.transaction_type, "rent");
  });

  it("returns range_low < median < range_high for all data points", () => {
    const { MARKET_DATA } = require("../../../lib/market/morocco-market-prices");
    for (const d of MARKET_DATA) {
      assert.ok(d.range_low < d.median_price_per_m2, `range_low should be < median for ${d.city} ${d.property_type}`);
      assert.ok(d.range_high > d.median_price_per_m2, `range_high should be > median for ${d.city} ${d.property_type}`);
      assert.ok(d.sample_count > 0, "sample_count must be > 0");
    }
  });

  it("confidence maps correctly to sample_count thresholds", () => {
    const { MARKET_DATA } = require("../../../lib/market/morocco-market-prices");
    for (const d of MARKET_DATA) {
      if (d.confidence === "élevée") assert.ok(d.sample_count >= 30);
      if (d.confidence === "faible") assert.ok(d.sample_count < 20);
    }
  });

  it("returns period string on all results", () => {
    const ref = getMarketReference("Tanger", "Malabata", "Appartement", "buy", 12000);
    assert.ok(ref !== null);
    assert.ok(ref.period.length > 0);
  });
});

describe("P10D - getListingObservedPriceComparison", () => {
  it("returns 'Prix cohérent' when price is within 10% of median", () => {
    const result = getListingObservedPriceComparison("Casablanca", "Maârif", "Appartement", "buy", 14200);
    assert.equal(result.comparison_label, "Prix cohérent");
    assert.ok(result.observed_price_per_m2 !== null);
    assert.equal(result.listing_price_per_m2, 14200);
  });

  it("returns 'Prix supérieur au repère observé' when price is >10% above median", () => {
    const result = getListingObservedPriceComparison("Casablanca", "Maârif", "Appartement", "buy", 17000);
    assert.equal(result.comparison_label, "Prix supérieur au repère observé");
    assert.ok(result.difference_percent !== null && result.difference_percent > 10);
  });

  it("returns 'Prix inférieur au repère observé' when price is >10% below median", () => {
    const result = getListingObservedPriceComparison("Casablanca", "Maârif", "Appartement", "buy", 11000);
    assert.equal(result.comparison_label, "Prix inférieur au repère observé");
    assert.ok(result.difference_percent !== null && result.difference_percent < -10);
  });

  it("returns 'Données insuffisantes' for unknown city", () => {
    const result = getListingObservedPriceComparison("Ville Inconnue", undefined, "Appartement", "buy", 10000);
    assert.equal(result.comparison_label, "Données insuffisantes");
    assert.equal(result.observed_price_per_m2, null);
    assert.equal(result.confidence, null);
    assert.equal(result.listings_count, null);
  });

  it("includes non-empty disclaimer on all results", () => {
    const known = getListingObservedPriceComparison("Rabat", "Agdal", "Appartement", "buy", 15000);
    assert.ok(known.disclaimer.length > 0);
    const unknown = getListingObservedPriceComparison("Nowhere", undefined, "Appartement", "buy", 10000);
    assert.ok(unknown.disclaimer.length > 0);
  });

  it("includes confidence and listings_count when data available", () => {
    const result = getListingObservedPriceComparison("Rabat", "Agdal", "Appartement", "buy", 15000);
    assert.ok(result.confidence !== null);
    assert.ok(result.listings_count !== null && result.listings_count > 0);
  });

  it("handles rent transaction type", () => {
    const result = getListingObservedPriceComparison("Casablanca", "Maârif", "Appartement", "rent", 120);
    assert.notEqual(result.comparison_label, "Données insuffisantes");
    assert.ok(result.observed_price_per_m2 !== null);
  });

  it("disclaimer never claims official price or guarantee", () => {
    const result = getListingObservedPriceComparison("Casablanca", "Finance City", "Appartement", "buy", 15000);
    assert.ok(!result.disclaimer.toLowerCase().includes("valeur garantie"));
    assert.ok(!result.disclaimer.toLowerCase().includes("prix officiel"));
    assert.ok(!result.disclaimer.toLowerCase().includes("estimation certifiée"));
  });
});
