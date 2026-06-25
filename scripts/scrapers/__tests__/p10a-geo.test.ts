import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  resolveListingGeo,
  getGeoPrecisionLabel,
} from "../../../lib/geo/resolve-listing-geo.js";
import {
  getCityCentroid,
  getNeighborhoodCentroid,
} from "../../../lib/geo/morocco-centroids.js";

// ─── City centroid lookups ──────────────────────────────────────────────────

describe("P10A — City centroid lookups", () => {
  test("returns centroid for known city (case-insensitive)", () => {
    const p = getCityCentroid("Casablanca");
    assert.ok(p !== null, "Casablanca centroid must exist");
    assert.ok(typeof p!.lat === "number");
    assert.ok(typeof p!.lng === "number");
    // Rough bounding box for Casablanca
    assert.ok(p!.lat > 33 && p!.lat < 34, "lat in range");
    assert.ok(p!.lng < -7 && p!.lng > -8, "lng in range");
  });

  test("returns centroid for Rabat", () => {
    const p = getCityCentroid("Rabat");
    assert.ok(p !== null);
    assert.ok(p!.lat > 33.5 && p!.lat < 34.5);
  });

  test("returns null for unknown city", () => {
    const p = getCityCentroid("UnknownCity");
    assert.equal(p, null);
  });

  test("accepts accented variants (Fès / Fes)", () => {
    const a = getCityCentroid("Fès");
    const b = getCityCentroid("Fes");
    assert.ok(a !== null && b !== null);
    assert.equal(a!.lat, b!.lat);
  });
});

// ─── Neighborhood centroid lookups ─────────────────────────────────────────

describe("P10A — Neighborhood centroid lookups", () => {
  test("returns centroid for known neighborhood (Founty, Agadir)", () => {
    const p = getNeighborhoodCentroid("Agadir", "Founty");
    assert.ok(p !== null, "Founty centroid must exist");
  });

  test("returns centroid for Hay Riad, Rabat", () => {
    const p = getNeighborhoodCentroid("Rabat", "Hay Riad");
    assert.ok(p !== null);
  });

  test("returns null for unknown neighborhood in known city", () => {
    const p = getNeighborhoodCentroid("Casablanca", "UnknownNeighborhood");
    assert.equal(p, null);
  });
});

// ─── resolveListingGeo — core fallback logic ────────────────────────────────

describe("P10A — resolveListingGeo fallback logic", () => {
  test("known neighborhood → geo_precision = neighborhood_centroid", () => {
    const result = resolveListingGeo("Agadir", "Founty");
    assert.equal(result.geo_precision, "neighborhood_centroid");
    assert.equal(result.geo_source, "neighborhood_centroid");
    assert.ok(result.latitude !== null);
    assert.ok(result.longitude !== null);
    assert.ok(result.geo_label.includes("Agadir"));
  });

  test("known city + unknown neighborhood → geo_precision = city_centroid", () => {
    const result = resolveListingGeo("Casablanca", "QuartierInconnu");
    assert.equal(result.geo_precision, "city_centroid");
    assert.equal(result.geo_source, "city_centroid");
    assert.ok(result.latitude !== null);
    assert.ok(result.longitude !== null);
  });

  test("known city + no neighborhood → geo_precision = city_centroid", () => {
    const result = resolveListingGeo("Marrakech", undefined);
    assert.equal(result.geo_precision, "city_centroid");
    assert.ok(result.latitude !== null);
  });

  test("unknown city → geo_precision = unknown, null coordinates", () => {
    const result = resolveListingGeo("VilleInexistante", "Quartier");
    assert.equal(result.geo_precision, "unknown");
    assert.equal(result.geo_source, "unknown");
    assert.equal(result.latitude, null);
    assert.equal(result.longitude, null);
  });

  test("null city → geo_precision = unknown, null coordinates", () => {
    const result = resolveListingGeo(null, null);
    assert.equal(result.geo_precision, "unknown");
    assert.equal(result.latitude, null);
    assert.equal(result.longitude, null);
  });

  test("Finance City, Casablanca → neighborhood_centroid", () => {
    const result = resolveListingGeo("Casablanca", "Finance City");
    assert.equal(result.geo_precision, "neighborhood_centroid");
    assert.ok(result.latitude !== null);
  });

  test("Mohammedia + unknown neighborhood → city_centroid", () => {
    const result = resolveListingGeo("Mohammedia", "Parc");
    assert.equal(result.geo_precision, "city_centroid");
    assert.ok(result.latitude !== null);
  });
});

// ─── getGeoPrecisionLabel — display helper ─────────────────────────────────

describe("P10A — getGeoPrecisionLabel display helper", () => {
  test("exact → Position exacte", () => {
    assert.equal(getGeoPrecisionLabel("exact"), "Position exacte");
  });

  test("neighborhood_centroid → Position approximative — quartier", () => {
    assert.equal(
      getGeoPrecisionLabel("neighborhood_centroid"),
      "Position approximative — quartier"
    );
  });

  test("city_centroid → Position approximative — ville", () => {
    assert.equal(
      getGeoPrecisionLabel("city_centroid"),
      "Position approximative — ville"
    );
  });

  test("unknown → Position non disponible", () => {
    assert.equal(getGeoPrecisionLabel("unknown"), "Position non disponible");
  });

  test("undefined → Position non disponible (safe fallback)", () => {
    assert.equal(getGeoPrecisionLabel(undefined), "Position non disponible");
  });
});
