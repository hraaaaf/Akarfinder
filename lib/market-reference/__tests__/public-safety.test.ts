import test from "node:test";
import assert from "node:assert/strict";

import { MOROCCO_REFERENCE_DATASET } from "@/lib/market-reference/morocco-reference-data";
import {
  assertNoUnsafePublicPriceExposure,
  canExposePricePointToPublic,
  filterPublicSafeReference,
  getPublicLifestyleSummary,
} from "@/lib/market-reference/public-safety";

test("internal price points cannot be exposed publicly", () => {
  for (const districtReference of MOROCCO_REFERENCE_DATASET.district_reference) {
    for (const pricePoint of districtReference.prices) {
      assert.equal(canExposePricePointToPublic(pricePoint), false);
    }
  }
});

test("internal district reference is blocked by filterPublicSafeReference", () => {
  const districtReference = MOROCCO_REFERENCE_DATASET.district_reference[0];
  assert.equal(filterPublicSafeReference(districtReference), null);
});

test("public lifestyle summary returns qualitative labels only", () => {
  const districtReference = MOROCCO_REFERENCE_DATASET.district_reference[0];
  const summary = getPublicLifestyleSummary(districtReference);

  assert.equal(summary.city, "Casablanca");
  assert.equal(typeof summary.lifestyle_indicators.urban_calm, "string");
  assert.equal("value_low" in (summary as Record<string, unknown>), false);
  assert.equal(summary.lifestyle_indicators.urban_calm.includes("prix"), false);
});

test("assertNoUnsafePublicPriceExposure rejects price-shaped payloads", () => {
  assert.throws(() =>
    assertNoUnsafePublicPriceExposure({
      district: "Maarif",
      value_low: 13000,
    }),
  );
});

test("safe qualitative payload passes public exposure assertion", () => {
  assert.doesNotThrow(() =>
    assertNoUnsafePublicPriceExposure({
      district: "Maarif",
      lifestyle: {
        urban_calm: "Animation elevee",
      },
    }),
  );
});
