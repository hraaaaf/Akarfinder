import assert from "node:assert/strict";
import test from "node:test";
import {
  PROMOIMMO_EXPANSION_BATCH_SIZES,
  PROMOIMMO_EXPANSION_REQUIRED_NEW,
  qualifyPromoImmoExpansion,
  requireQualifiedPromoImmoExpansion,
  type PromoImmoExpansionCandidate,
} from "../promoimmo-controlled-expansion";

function candidate(index: number, overrides: Partial<PromoImmoExpansionCandidate> = {}): PromoImmoExpansionCandidate {
  return {
    canonicalUrl: `https://promoimmomarrakech.com/property-${index}`,
    freshnessStatus: "seed_only",
    normalizationStatus: "normalized",
    city: "Marrakech",
    propertyType: "apartment",
    intent: "sale",
    qualityTier: "A",
    qualityScore: 1000 - index / 1000,
    displayEligibility: "eligible_public",
    publicSearchPresent: true,
    technicalDisplayPresent: true,
    exactCrossSourceCollision: false,
    alreadySitemapConfirmed: false,
    ...overrides,
  };
}

test("requires the certified 50-row baseline", () => {
  assert.throws(() => qualifyPromoImmoExpansion([], 49), /Expected certified Promo Immo baseline 50/);
});

test("qualifies exactly 450 new rows and preserves deterministic batching", () => {
  const rows = Array.from({ length: 500 }, (_, index) => candidate(index));
  const result = qualifyPromoImmoExpansion(rows, 50);
  assert.equal(result.qualified, true);
  assert.equal(result.selectedRows.length, PROMOIMMO_EXPANSION_REQUIRED_NEW);
  assert.deepEqual([...result.batchSizes], [...PROMOIMMO_EXPANSION_BATCH_SIZES]);
  assert.equal(result.batchSizes.reduce((sum, size) => sum + size, 0), 450);
  requireQualifiedPromoImmoExpansion(result);
});

test("excludes already-confirmed, colliding, non-display and non-Marrakech rows", () => {
  const valid = Array.from({ length: 450 }, (_, index) => candidate(index));
  const invalid = [
    candidate(900, { alreadySitemapConfirmed: true }),
    candidate(901, { exactCrossSourceCollision: true }),
    candidate(902, { displayEligibility: null }),
    candidate(903, { city: "Casablanca" }),
  ];
  const result = qualifyPromoImmoExpansion([...invalid, ...valid], 50);
  assert.equal(result.qualified, true);
  assert.equal(result.eligibleNewRows, 450);
  assert.equal(result.selectedRows.some((row) => row.canonicalUrl.includes("property-900")), false);
});

test("fails closed below the 450-row expansion requirement", () => {
  const rows = Array.from({ length: 449 }, (_, index) => candidate(index));
  const result = qualifyPromoImmoExpansion(rows, 50);
  assert.equal(result.qualified, false);
  assert.throws(() => requireQualifiedPromoImmoExpansion(result), /not qualified/);
});

test("selection is deterministic by quality then canonical URL", () => {
  const rows = [
    candidate(2, { qualityScore: 9 }),
    candidate(1, { qualityScore: 10 }),
    candidate(3, { qualityScore: 9 }),
    ...Array.from({ length: 447 }, (_, index) => candidate(index + 10, { qualityScore: 8 })),
  ];
  const result = qualifyPromoImmoExpansion(rows, 50);
  requireQualifiedPromoImmoExpansion(result);
  assert.equal(result.selectedRows[0]?.canonicalUrl, "https://promoimmomarrakech.com/property-1");
  assert.equal(result.selectedRows[1]?.canonicalUrl, "https://promoimmomarrakech.com/property-2");
  assert.equal(result.selectedRows[2]?.canonicalUrl, "https://promoimmomarrakech.com/property-3");
});
