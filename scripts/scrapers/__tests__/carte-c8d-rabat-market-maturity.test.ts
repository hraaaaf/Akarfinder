import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const snapshot = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/geo/rabat-c8d-market-maturity-2026-08-16.json"), "utf8"),
) as {
  mode: string;
  publicMetric: boolean;
  productionWriteCount: number;
  candidates: Array<{
    slug: string;
    listings: number;
    sources: number;
    saleListings: number;
    rentListings: number;
    salePriceM2Samples: number;
    observedSalePriceM2Median?: number;
  }>;
  observations: {
    candidateUniqueMatches: number;
    candidatesWithAnyListings: number;
    candidatesWithAtLeastTwoSources: number;
    maxSalePriceM2SampleCountPerCandidate: number;
    publicPriceM2ReadyCount: number;
  };
};

test("C8D market maturity snapshot is diagnostic only", () => {
  assert.equal(snapshot.mode, "production_read_only");
  assert.equal(snapshot.publicMetric, false);
  assert.equal(snapshot.productionWriteCount, 0);
});

test("C8D market maturity covers all 18 candidates exactly once", () => {
  assert.equal(snapshot.candidates.length, 18);
  const slugs = snapshot.candidates.map((candidate) => candidate.slug);
  assert.equal(new Set(slugs).size, 18);
});

test("C8D market maturity counts reconcile with shadow candidate matches", () => {
  const listings = snapshot.candidates.reduce((sum, candidate) => sum + candidate.listings, 0);
  assert.equal(listings, snapshot.observations.candidateUniqueMatches);
  assert.equal(snapshot.observations.candidateUniqueMatches, 68);
  assert.equal(snapshot.candidates.filter((candidate) => candidate.listings > 0).length, 11);
  assert.equal(snapshot.candidates.filter((candidate) => candidate.sources >= 2).length, 7);
});

test("C8D does not claim price-per-m2 readiness from sparse samples", () => {
  const maxSamples = Math.max(...snapshot.candidates.map((candidate) => candidate.salePriceM2Samples));
  assert.equal(maxSamples, 2);
  assert.equal(snapshot.observations.maxSalePriceM2SampleCountPerCandidate, 2);
  assert.equal(snapshot.observations.publicPriceM2ReadyCount, 0);
});

test("C8D observed medians exist only when at least one sale price-per-m2 sample exists", () => {
  for (const candidate of snapshot.candidates) {
    if (candidate.observedSalePriceM2Median !== undefined) {
      assert.ok(candidate.salePriceM2Samples > 0, `${candidate.slug} median without sample`);
    }
  }
});
