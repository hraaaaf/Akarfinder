import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/geo/rabat-shadow-audit-2026-08-16.json"), "utf8"),
) as {
  mode: string;
  publicMetric: boolean;
  productionWriteCount: number;
  corpus: { sourceCount: number; listingCount: number };
  result: {
    matchedUnique: number;
    ambiguous: number;
    unmatched: number;
    certifiedOrHistoricalMatches: number;
    candidateMatches: number;
  };
  bySource: Record<string, { matchedUnique: number; ambiguous: number; unmatched: number; total: number }>;
  byLocalityUniqueMatches: Record<string, number>;
  historicalTruthCrossValidation: {
    goldSetSize: number;
    matchedCorrect: number;
    ambiguous: number;
    matchedWrong: number;
    unmatched: number;
    observedUniqueDecisionPrecision: number;
    decisiveCoverage: number;
    statisticalCertification: boolean;
  };
};

test("C8D shadow audit manifest is internally balanced", () => {
  assert.equal(manifest.mode, "production_read_only");
  assert.equal(manifest.publicMetric, false);
  assert.equal(manifest.productionWriteCount, 0);
  assert.equal(manifest.corpus.sourceCount, 6);
  assert.equal(manifest.corpus.listingCount, 984);
  assert.equal(
    manifest.result.matchedUnique + manifest.result.ambiguous + manifest.result.unmatched,
    manifest.corpus.listingCount,
  );
  assert.equal(
    manifest.result.certifiedOrHistoricalMatches + manifest.result.candidateMatches,
    manifest.result.matchedUnique,
  );
});

test("C8D shadow audit source buckets sum to the bounded corpus", () => {
  const totals = Object.values(manifest.bySource).reduce(
    (acc, source) => ({
      matchedUnique: acc.matchedUnique + source.matchedUnique,
      ambiguous: acc.ambiguous + source.ambiguous,
      unmatched: acc.unmatched + source.unmatched,
      total: acc.total + source.total,
    }),
    { matchedUnique: 0, ambiguous: 0, unmatched: 0, total: 0 },
  );
  assert.deepEqual(totals, {
    matchedUnique: manifest.result.matchedUnique,
    ambiguous: manifest.result.ambiguous,
    unmatched: manifest.result.unmatched,
    total: manifest.corpus.listingCount,
  });
});

test("C8D shadow audit locality counts sum to unique matches and preserve Kebibat evidence", () => {
  const localityTotal = Object.values(manifest.byLocalityUniqueMatches).reduce((sum, value) => sum + value, 0);
  assert.equal(localityTotal, manifest.result.matchedUnique);
  assert.equal(manifest.byLocalityUniqueMatches.kbibat, 9);
});

test("C8D shadow gold set remains evidence, not statistical certification", () => {
  const gold = manifest.historicalTruthCrossValidation;
  assert.equal(gold.goldSetSize, 40);
  assert.equal(gold.matchedCorrect, 39);
  assert.equal(gold.ambiguous, 1);
  assert.equal(gold.matchedWrong, 0);
  assert.equal(gold.unmatched, 0);
  assert.equal(gold.observedUniqueDecisionPrecision, 1);
  assert.equal(gold.decisiveCoverage, 0.975);
  assert.equal(gold.statisticalCertification, false);
});
