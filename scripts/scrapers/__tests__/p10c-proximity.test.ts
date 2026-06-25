// P10C — Tests for proximity static dataset and getListingProximity helper

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getListingProximity } from "@/lib/proximity/get-listing-proximity";
import type { ProximityPoint } from "@/lib/proximity/types";

const ALL_CATEGORIES = [
  "marche_souk",
  "supermarche",
  "hanout",
  "taxi",
  "transport",
  "pharmacie",
  "ecole",
  "mosquee",
  "clinique",
  "banque",
  "parking",
  "cafe",
  "espace_vert",
] as const;

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function hasRequiredFields(point: ProximityPoint): boolean {
  return (
    typeof point.category === "string" &&
    typeof point.label === "string" &&
    typeof point.distance_minutes === "number" &&
    typeof point.mode === "string" &&
    typeof point.confidence === "string" &&
    typeof point.source === "string" &&
    point.label.length > 0 &&
    point.distance_minutes >= 1 &&
    point.distance_minutes <= 30 &&
    (point.mode === "à pied" || point.mode === "en voiture") &&
    (point.confidence === "élevé" || point.confidence === "moyen" || point.confidence === "indicatif")
  );
}

function scoreWithin15(points: ProximityPoint[]): number {
  return new Set(
    points
      .filter((p) => p.distance_minutes <= 15)
      .map((p) => p.category)
  ).size;
}

// ─────────────────────────────────────────────────────────────────
// 1. Covered city + neighborhood → >= 8 points
// ─────────────────────────────────────────────────────────────────

describe("P10C - covered city+neighborhood returns >= 8 points", () => {
  const coveredPairs: [string, string][] = [
    ["Casablanca", "Finance City"],
    ["Casablanca", "Maârif"],
    ["Casablanca", "Bouskoura"],
    ["Rabat", "Hay Riad"],
    ["Rabat", "Agdal"],
    ["Rabat", "Hassan"],
    ["Tanger", "Malabata"],
    ["Tanger", "Ville Nouvelle"],
    ["Marrakech", "Guéliz"],
    ["Marrakech", "Hivernage"],
    ["Agadir", "Founty"],
    ["Agadir", "Talborjt"],
    ["Fès", "Ville Nouvelle"],
    ["Fès", "Fès el Bali"],
  ];

  for (const [city, neighborhood] of coveredPairs) {
    it(`${city} / ${neighborhood} → >= 8 points`, () => {
      const points = getListingProximity(city, neighborhood);
      assert.ok(
        points.length >= 8,
        `Expected >= 8 points for ${city}/${neighborhood}, got ${points.length}`
      );
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// 2. Unknown city → []
// ─────────────────────────────────────────────────────────────────

describe("P10C - unknown city returns empty array", () => {
  it("unknown city with no neighborhood → []", () => {
    const points = getListingProximity("Ouarzazate");
    assert.equal(points.length, 0);
  });

  it("unknown city with neighborhood → []", () => {
    const points = getListingProximity("Laâyoune", "Quartier X");
    assert.equal(points.length, 0);
  });

  it("empty string city → []", () => {
    const points = getListingProximity("UnknownCityXYZ");
    assert.equal(points.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. City-only fallback → >= 5 points
// ─────────────────────────────────────────────────────────────────

describe("P10C - city-only fallback returns >= 5 points", () => {
  const cities = ["Casablanca", "Rabat", "Tanger", "Marrakech", "Agadir", "Fès"];

  for (const city of cities) {
    it(`${city} city-only → >= 5 points`, () => {
      // Pass an unknown neighborhood to force city fallback
      const points = getListingProximity(city, "UnknownQuartierXYZ");
      assert.ok(
        points.length >= 5,
        `Expected >= 5 points for city fallback of ${city}, got ${points.length}`
      );
    });
  }

  it("city-only (no neighborhood arg) → >= 5 points", () => {
    const points = getListingProximity("Casablanca");
    assert.ok(points.length >= 5, `Expected >= 5, got ${points.length}`);
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. All points have required fields
// ─────────────────────────────────────────────────────────────────

describe("P10C - all required fields present and valid", () => {
  const testCases: [string, string | undefined][] = [
    ["Casablanca", "Finance City"],
    ["Rabat", "Hay Riad"],
    ["Marrakech", "Guéliz"],
    ["Agadir", "Founty"],
    ["Fès", "Fès el Bali"],
    ["Casablanca", undefined],
  ];

  for (const [city, neighborhood] of testCases) {
    const label = neighborhood ? `${city}/${neighborhood}` : city;
    it(`${label} — all points have required fields`, () => {
      const points = getListingProximity(city, neighborhood);
      for (const point of points) {
        assert.ok(
          hasRequiredFields(point),
          `Invalid point in ${label}: ${JSON.stringify(point)}`
        );
        assert.ok(
          (ALL_CATEGORIES as readonly string[]).includes(point.category),
          `Unknown category "${point.category}" in ${label}`
        );
      }
    });
  }

  it("source field always contains 'OpenStreetMap'", () => {
    const points = getListingProximity("Casablanca", "Finance City");
    assert.ok(points.length > 0);
    for (const point of points) {
      assert.ok(
        point.source.includes("OpenStreetMap"),
        `Source missing 'OpenStreetMap': ${point.source}`
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// 5. Score calculation: X/13 within 15 min
// ─────────────────────────────────────────────────────────────────

describe("P10C - score calculation within 15 min", () => {
  it("Finance City has >= 5 categories within 15 min", () => {
    const points = getListingProximity("Casablanca", "Finance City");
    const score = scoreWithin15(points);
    assert.ok(score >= 5, `Expected score >= 5, got ${score}`);
  });

  it("Maârif has high walkability (>= 8 categories within 15 min)", () => {
    const points = getListingProximity("Casablanca", "Maârif");
    const score = scoreWithin15(points);
    assert.ok(score >= 8, `Expected >= 8 walkable categories in Maârif, got ${score}`);
  });

  it("score is always <= total categories (13)", () => {
    const points = getListingProximity("Rabat", "Hay Riad");
    const score = scoreWithin15(points);
    assert.ok(score <= ALL_CATEGORIES.length, `Score ${score} exceeds maximum ${ALL_CATEGORIES.length}`);
  });

  it("city fallback Casablanca has some accessible categories", () => {
    const points = getListingProximity("Casablanca");
    const score = scoreWithin15(points);
    assert.ok(score >= 1, `Expected at least 1 accessible category, got ${score}`);
  });

  it("distance_minutes values are integers between 1 and 30", () => {
    const points = getListingProximity("Marrakech", "Guéliz");
    for (const point of points) {
      assert.ok(Number.isInteger(point.distance_minutes), `Non-integer distance: ${point.distance_minutes}`);
      assert.ok(point.distance_minutes >= 1 && point.distance_minutes <= 30,
        `Out-of-range distance: ${point.distance_minutes}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// 6. Normalization tolerance
// ─────────────────────────────────────────────────────────────────

describe("P10C - normalization handles accents and casing", () => {
  it("'casablanca' (lowercase) works as city", () => {
    const points = getListingProximity("casablanca");
    assert.ok(points.length >= 5, `Expected >= 5, got ${points.length}`);
  });

  it("'CASABLANCA' (uppercase) works as city", () => {
    const points = getListingProximity("CASABLANCA");
    assert.ok(points.length >= 5, `Expected >= 5, got ${points.length}`);
  });

  it("'maarif' without accent finds Maârif data", () => {
    // normalize strips accents so 'maarif' == 'maarif' after normalization of 'Maârif'
    const points = getListingProximity("Casablanca", "Maarif");
    assert.ok(points.length >= 8, `Expected >= 8, got ${points.length}`);
  });
});
