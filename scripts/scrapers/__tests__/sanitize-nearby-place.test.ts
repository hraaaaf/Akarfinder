// NEIGHBORHOOD-PROXIMITY-DB-SANITIZE-1 — Tests for sanitizeNearbyPlaceTime

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeNearbyPlaceTime } from "@/lib/listings/sanitize-nearby-place";

// ─────────────────────────────────────────────────────────────────
// 1. Exact minute values → qualitative labels
// ─────────────────────────────────────────────────────────────────

describe("sanitizeNearbyPlaceTime — exact minutes → qualitative", () => {
  it('"5 min" (DB, no source) → "à proximité"', () => {
    const result = sanitizeNearbyPlaceTime("5 min");
    assert.equal(result.display_label, "à proximité");
    assert.equal(result.is_estimated, true);
    assert.equal(result.should_show_exact_minutes, false);
  });

  it('"6 min" (DB, no source) → "dans le secteur"', () => {
    const result = sanitizeNearbyPlaceTime("6 min");
    assert.equal(result.display_label, "dans le secteur");
    assert.equal(result.is_estimated, true);
  });

  it('"10 min à pied" (DB, no source) → "dans le secteur"', () => {
    const result = sanitizeNearbyPlaceTime("10 min à pied");
    assert.equal(result.display_label, "dans le secteur");
    assert.equal(result.is_estimated, true);
  });

  it('"13 min" (DB, no source) → "accessible"', () => {
    const result = sanitizeNearbyPlaceTime("13 min");
    assert.equal(result.display_label, "accessible");
    assert.equal(result.is_estimated, true);
  });

  it('"15 min" boundary → "accessible"', () => {
    const result = sanitizeNearbyPlaceTime("15 min");
    assert.equal(result.display_label, "accessible");
    assert.equal(result.is_estimated, true);
  });

  it('"16 min" just above boundary → "à vérifier"', () => {
    const result = sanitizeNearbyPlaceTime("16 min");
    assert.equal(result.display_label, "à vérifier");
    assert.equal(result.is_estimated, true);
  });

  it('"20 min" (DB, no source) → "à vérifier"', () => {
    const result = sanitizeNearbyPlaceTime("20 min");
    assert.equal(result.display_label, "à vérifier");
    assert.equal(result.is_estimated, true);
  });

  it('"1 min" (DB, very close) → "à proximité"', () => {
    const result = sanitizeNearbyPlaceTime("1 min");
    assert.equal(result.display_label, "à proximité");
    assert.equal(result.is_estimated, true);
  });

  it('"3 min" (DB, no source) → "à proximité"', () => {
    const result = sanitizeNearbyPlaceTime("3 min");
    assert.equal(result.display_label, "à proximité");
    assert.equal(result.is_estimated, true);
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. Already-qualitative labels → preserved unchanged
// ─────────────────────────────────────────────────────────────────

describe("sanitizeNearbyPlaceTime — qualitative labels preserved", () => {
  it('"à proximité" already qualitative → preserved', () => {
    const result = sanitizeNearbyPlaceTime("à proximité");
    assert.equal(result.display_label, "à proximité");
    assert.equal(result.is_estimated, false);
  });

  it('"dans le secteur" already qualitative → preserved', () => {
    const result = sanitizeNearbyPlaceTime("dans le secteur");
    assert.equal(result.display_label, "dans le secteur");
    assert.equal(result.is_estimated, false);
  });

  it('"accessible" already qualitative → preserved', () => {
    const result = sanitizeNearbyPlaceTime("accessible");
    assert.equal(result.display_label, "accessible");
    assert.equal(result.is_estimated, false);
  });

  it('"à vérifier" already qualitative → preserved', () => {
    const result = sanitizeNearbyPlaceTime("à vérifier");
    assert.equal(result.display_label, "à vérifier");
    assert.equal(result.is_estimated, false);
  });

  it('"présence possible dans le secteur" → preserved', () => {
    const result = sanitizeNearbyPlaceTime("présence possible dans le secteur");
    assert.equal(result.display_label, "présence possible dans le secteur");
    assert.equal(result.is_estimated, false);
  });

  it('"à confirmer lors de la visite" → preserved', () => {
    const result = sanitizeNearbyPlaceTime("à confirmer lors de la visite");
    assert.equal(result.display_label, "à confirmer lors de la visite");
    assert.equal(result.is_estimated, false);
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. OSM dataset distinction (rule: ProximityPoint with source/confidence
//    stays in ProximityBlock, NOT in NeighborhoodAmenities.
//    NearbyPlace has no source field → always sanitize.)
// ─────────────────────────────────────────────────────────────────

describe("sanitizeNearbyPlaceTime — unknown format passthrough", () => {
  it("unknown custom label is preserved without mutation", () => {
    const result = sanitizeNearbyPlaceTime("quartier animé");
    assert.equal(result.display_label, "quartier animé");
    assert.equal(result.is_estimated, false);
  });

  it("empty string is preserved", () => {
    const result = sanitizeNearbyPlaceTime("");
    assert.equal(result.display_label, "");
    assert.equal(result.is_estimated, false);
  });

  it("whitespace-only is trimmed and preserved", () => {
    const result = sanitizeNearbyPlaceTime("   ");
    assert.equal(result.display_label, "");
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. Invariant: should_show_exact_minutes is always false
//    (NearbyPlace never has a declared source)
// ─────────────────────────────────────────────────────────────────

describe("sanitizeNearbyPlaceTime — should_show_exact_minutes always false", () => {
  const cases = ["5 min", "10 min", "20 min", "à proximité", "dans le secteur", "quartier"];
  for (const input of cases) {
    it(`"${input}" → should_show_exact_minutes === false`, () => {
      const result = sanitizeNearbyPlaceTime(input);
      assert.equal(result.should_show_exact_minutes, false);
    });
  }
});
