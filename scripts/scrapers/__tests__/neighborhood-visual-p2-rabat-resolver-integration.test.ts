import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RABAT_REAL_PHOTO_LIBRARY,
  normalizeRabatNeighborhood,
  resolveRabatRealPhoto,
} from "../../../lib/contextual-illustrations/rabat-real-photo-library";

const newDistricts = ["Akkari", "Aviation", "Les Orangers", "Médina", "Yacoub El Mansour"] as const;

describe("NEIGHBORHOOD-VISUAL-P2 — Rabat resolver integration", () => {
  it("activates exactly the five previously missing certified P1 pools with context-safe public labels", () => {
    for (const district of newDistricts) {
      const pool = RABAT_REAL_PHOTO_LIBRARY[district];
      assert.equal(pool.length, 3, district);
      assert.equal(new Set(pool.map((asset) => asset.id)).size, 3, district);
      assert.ok(pool.every((asset) => asset.label === `Rabat • contexte ${district}`), district);
    }
  });

  it("normalizes certified aliases without fuzzy geographic guessing", () => {
    assert.equal(normalizeRabatNeighborhood("Akkari"), "Akkari");
    assert.equal(normalizeRabatNeighborhood("Les Orangers"), "Les Orangers");
    assert.equal(normalizeRabatNeighborhood("Medina de Rabat"), "Médina");
    assert.equal(normalizeRabatNeighborhood("Yaacoub El Mansour"), "Yacoub El Mansour");
    assert.equal(normalizeRabatNeighborhood("Hay El Fath"), "Yacoub El Mansour");
    assert.equal(normalizeRabatNeighborhood("Hay Al Fath"), "Yacoub El Mansour");
    assert.equal(normalizeRabatNeighborhood("random district"), null);
  });

  it("resolves new districts deterministically and only for Rabat", () => {
    for (const district of newDistricts) {
      const input = { stableKey: `https://example.test/${district}`, city: "Rabat", district };
      const first = resolveRabatRealPhoto(input);
      const second = resolveRabatRealPhoto(input);
      assert.ok(first, district);
      assert.deepEqual(second, first, district);
      assert.equal(first.contextScope, "district", district);
      assert.equal(first.district, district, district);
      assert.equal(first.label, `Rabat • contexte ${district}`, district);
      assert.ok(RABAT_REAL_PHOTO_LIBRARY[district].some((asset) => asset.id === first.id), district);
      assert.equal(resolveRabatRealPhoto({ ...input, city: "Casablanca" }), null, district);
    }
  });

  it("keeps city-wide fallback city-only", () => {
    const resolved = resolveRabatRealPhoto({
      stableKey: "https://example.test/rabat-city-fallback",
      city: "Rabat",
      district: "Unknown district",
    });
    assert.ok(resolved);
    assert.equal(resolved.contextScope, "city");
    assert.equal(resolved.label, "Rabat");
  });
});
