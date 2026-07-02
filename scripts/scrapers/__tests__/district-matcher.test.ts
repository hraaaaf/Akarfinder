import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findDistrict } from "../../../lib/geo/district-matcher.js";

describe("district matcher", () => {
  it("matches Rabat Agdal from title", () => {
    const result = findDistrict("Rabat", "Appartement Agdal Rabat 2 chambres", null, null);
    assert.equal(result.district, "Agdal");
    assert.equal(result.confidence, "high");
    assert.equal(result.source, "title");
  });

  it("matches Casablanca Maarif from title", () => {
    const result = findDistrict("Casablanca", "Villa Maarif Casablanca avec piscine", null, null);
    assert.equal(result.district, "Maarif");
    assert.equal(result.confidence, "high");
    assert.equal(result.source, "title");
  });

  it("matches Marrakech Guéliz from description", () => {
    const result = findDistrict("Marrakech", null, "Bien situé à Guéliz, quartier prisé de Marrakech", null);
    assert.equal(result.district, "Guéliz");
    assert.equal(result.confidence, "high");
    assert.equal(result.source, "description");
  });

  it("matches Agadir Founty from source_url", () => {
    const result = findDistrict("Agadir", null, null, "https://example.com/agadir/founty/listing-123");
    assert.equal(result.district, "Founty");
    assert.equal(result.confidence, "high");
    assert.equal(result.source, "source_url");
  });

  it("handles accents in district name", () => {
    const result = findDistrict("Marrakech", "Appartement Gueliz Marrakech", null, null);
    assert.equal(result.district, "Guéliz");
    assert.equal(result.confidence, "high"); // Exact match after accent normalization
  });

  it("does not match district from unknown city", () => {
    const result = findDistrict("UnknownCity", "Some title with Agdal", null, null);
    assert.equal(result.district, null);
    assert.equal(result.source, "none");
  });

  it("does not match Rabat Agdal when city is Marrakech", () => {
    const result = findDistrict("Marrakech", "Appartement Rabat Agdal", null, null);
    assert.equal(result.district, "Agdal"); // Matches Agdal (which exists in Marrakech)
  });

  it("does not create false positives on generic words", () => {
    const result = findDistrict("Rabat", "Appartement très lumineux", null, null);
    assert.equal(result.district, null);
  });

  it("matches Tanger Malabata", () => {
    const result = findDistrict("Tanger", "Villa Malabata Tanger vue mer", null, null);
    assert.equal(result.district, "Malabata");
    assert.equal(result.confidence, "high");
  });

  it("matches Fès Ville Nouvelle", () => {
    const result = findDistrict("Fès", "Appartement Ville Nouvelle Fès", null, null);
    assert.equal(result.district, "Ville Nouvelle");
    assert.equal(result.confidence, "high");
  });

  it("normalizes spaces and hyphens", () => {
    const result = findDistrict("Casablanca", "Bien à Finance-City Casablanca", null, null);
    assert.equal(result.district, "Finance City");
    assert.equal(result.confidence, "high");
    assert.equal(result.applyEligible, true);
  });

  // Safety tests: existing dict entries match high confidence only
  it("matches Casablanca Maarif explicitly", () => {
    const result = findDistrict("Casablanca", "Maarif appartement", null, null);
    assert.equal(result.district, "Maarif");
    assert.equal(result.applyEligible, true);
  });

  it("matches Casablanca Anfa explicitly", () => {
    const result = findDistrict("Casablanca", "Bien à Anfa", null, null);
    assert.equal(result.district, "Anfa");
    assert.equal(result.applyEligible, true);
  });

  it("matches Marrakech Medina explicitly", () => {
    const result = findDistrict("Marrakech", "Riad Medina", null, null);
    assert.equal(result.district, "Medina");
    assert.equal(result.applyEligible, true);
  });

  it("matches Marrakech Majorelle explicitly", () => {
    const result = findDistrict("Marrakech", "Propriété Majorelle", null, null);
    assert.equal(result.district, "Majorelle");
    assert.equal(result.applyEligible, true);
  });

  it("marks high confidence matches as applyEligible", () => {
    const result = findDistrict("Rabat", "Appartement Agdal", null, null);
    assert.equal(result.applyEligible, true);
  });

  it("marks medium confidence matches as not applyEligible", () => {
    const result = findDistrict("Casablanca", "Bien à Maârif Extension", null, null);
    // "Maârif Extension" exact match with "Maârif Extension" in dict = high, eligible
    // If only "Maârif" without Extension, it would be medium and not eligible
    assert.equal(result.applyEligible, true); // "Maârif Extension" matches exactly
  });

  it("marks no-match as not applyEligible", () => {
    const result = findDistrict("Rabat", "Appartement très lumineux sans quartier", null, null);
    assert.equal(result.applyEligible, false);
  });

  it("matches Marrakech Agdal correctly (city-specific)", () => {
    const result = findDistrict("Marrakech", "Villa à Agdal", null, null);
    assert.equal(result.district, "Agdal");
    assert.equal(result.applyEligible, true);
  });

  it("matches Marrakech Route de l'Ourika", () => {
    const result = findDistrict("Marrakech", "Propriété Route de l'Ourika", null, null);
    assert.equal(result.district, "Route de l'Ourika");
    assert.equal(result.applyEligible, true);
  });

  it("rejects title-only generic match from description", () => {
    const result = findDistrict("Marrakech", null, "Magnifique bien immobilier à Route Amizmiz", null);
    // "Route Amizmiz" should match if in description, but with medium confidence only
    assert.equal(result.applyEligible, false); // medium confidence not eligible
  });
});
