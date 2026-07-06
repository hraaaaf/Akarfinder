import test from "node:test";
import assert from "node:assert/strict";

import {
  MOROCCO_REFERENCE_DATASET,
  MOROCCO_REFERENCE_FORBIDDEN_PUBLIC_CLAIMS,
} from "@/lib/market-reference/morocco-reference-data";
import {
  isConfidenceAllowedForPricePoint,
  isNormalizedReferenceId,
  validateMoroccoReferenceDataset,
} from "@/lib/market-reference/validators";

test("market-reference dataset validates cleanly", () => {
  const result = validateMoroccoReferenceDataset(MOROCCO_REFERENCE_DATASET);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("market-reference ids are unique and normalized", () => {
  const ids = [
    ...MOROCCO_REFERENCE_DATASET.cities.map((cityReference) => cityReference.id),
    ...MOROCCO_REFERENCE_DATASET.district_reference.map(
      (districtReference) => districtReference.id,
    ),
  ];

  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((id) => assert.equal(isNormalizedReferenceId(id), true, id));
});

test("all price points remain internal and public_safe=false", () => {
  for (const districtReference of MOROCCO_REFERENCE_DATASET.district_reference) {
    for (const pricePoint of districtReference.prices) {
      assert.equal(pricePoint.public_safe, false);
      assert.equal(pricePoint.internal_only, true);
    }
  }
});

test("forbidden public claims include forbidden pricing and trust wording", () => {
  const forbiddenTerms = new Set(
    MOROCCO_REFERENCE_FORBIDDEN_PUBLIC_CLAIMS.map((entry) => entry.term),
  );

  [
    "prix de marche",
    "prix officiel",
    "prix reel",
    "quartier dangereux",
    "annonce verifiee",
    "annonce fiable",
  ].forEach((term) => assert.equal(forbiddenTerms.has(term), true, term));
});

test("source_url=null caps confidence for portal_listing_prices and manual_review", () => {
  const districts = MOROCCO_REFERENCE_DATASET.district_reference;
  const guelizPricePoint = districts
    .flatMap((districtReference) => districtReference.prices)
    .find(
      (pricePoint) =>
        pricePoint.source_type === "portal_listing_prices" &&
        pricePoint.source_url === null,
    );
  const manualReviewPricePoints = districts
    .flatMap((districtReference) => districtReference.prices)
    .filter(
      (pricePoint) =>
        pricePoint.source_type === "manual_review" &&
        pricePoint.source_url === null,
    );

  assert.ok(guelizPricePoint);
  assert.equal(guelizPricePoint.confidence, "low");
  assert.equal(isConfidenceAllowedForPricePoint(guelizPricePoint), true);

  for (const pricePoint of manualReviewPricePoints) {
    assert.notEqual(pricePoint.confidence, "high");
    assert.equal(isConfidenceAllowedForPricePoint(pricePoint), true);
  }
});

test("every price point without source_url keeps an evidence_ref", () => {
  for (const districtReference of MOROCCO_REFERENCE_DATASET.district_reference) {
    for (const pricePoint of districtReference.prices) {
      if (pricePoint.source_url === null) {
        assert.ok(pricePoint.evidence_ref);
      }
    }
  }
});
