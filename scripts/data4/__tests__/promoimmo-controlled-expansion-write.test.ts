import assert from "node:assert/strict";
import test from "node:test";
import {
  DATA_4_5B_BATCH_SIZES,
  buildExpansionWritePlan,
  expectedBatchNumber,
  expectedBatchSize,
  selectExpansionBatch,
  validateCurrentSitemapEvidence,
  assertPostBatchCertification,
  type CurrentSitemapEvidence,
  type ExpansionWriteCandidate,
} from "../promoimmo-controlled-expansion-write";
import { PROMOIMMO_CHANNEL, type SeedSnapshot } from "../promoimmo-sitemap-canary";

const NOW = new Date("2026-08-09T12:00:00.000Z");

function evidence(count = 500, observedAt = "2026-08-09T11:30:00.000Z"): CurrentSitemapEvidence {
  return {
    schemaVersion: "data-4-5b-promoimmo-current-sitemap-evidence-v1",
    sourceDomain: "promoimmomarrakech.com",
    channel: PROMOIMMO_CHANNEL,
    observedAt,
    collector: "direct-sitemap-test",
    sourceSiteDetailRequests: 0,
    rows: Array.from({ length: count }, (_, index) => ({
      canonicalUrl: `https://promoimmomarrakech.com/property/${String(index).padStart(4, "0")}`,
      sitemapUrl: "https://promoimmomarrakech.com/sitemap-properties.xml",
    })),
  };
}

function candidate(index: number, overrides: Partial<ExpansionWriteCandidate> = {}): ExpansionWriteCandidate {
  return {
    canonicalUrl: `https://promoimmomarrakech.com/property/${String(index).padStart(4, "0")}`,
    qualityScore: 1000 - index,
    publicSearchPresent: true,
    technicalDisplayPresent: true,
    qualityTier: "A",
    displayEligibility: "eligible_external_tail",
    exactCrossSourceCollision: false,
    ...overrides,
  };
}

function seed(index: number): SeedSnapshot {
  return {
    canonicalUrl: candidate(index).canonicalUrl,
    freshnessStatus: "seed_only",
    freshLastSeenAt: null,
    freshChannels: ["commoncrawl_cdx"],
    metadata: { existing: true },
    updatedAt: "2026-08-08T00:00:00.000Z",
  };
}

test("uses exact 100+100+100+100+50 checkpoints", () => {
  assert.deepEqual(DATA_4_5B_BATCH_SIZES, [100, 100, 100, 100, 50]);
  assert.equal(expectedBatchNumber(50), 1);
  assert.equal(expectedBatchNumber(150), 2);
  assert.equal(expectedBatchNumber(250), 3);
  assert.equal(expectedBatchNumber(350), 4);
  assert.equal(expectedBatchNumber(450), 5);
  assert.equal(expectedBatchNumber(500), null);
  assert.equal(expectedBatchSize(50), 100);
  assert.equal(expectedBatchSize(450), 50);
  assert.equal(expectedBatchSize(500), 0);
  assert.throws(() => expectedBatchSize(149), /invalid checkpoint/);
});

test("current sitemap evidence expires after two hours and forbids detail fetches", () => {
  assert.equal(validateCurrentSitemapEvidence(evidence(), NOW).size, 500);
  assert.throws(() => validateCurrentSitemapEvidence(evidence(500, "2026-08-09T09:59:59.000Z"), NOW), /expired/);
  assert.throws(() => validateCurrentSitemapEvidence({ ...evidence(), sourceSiteDetailRequests: 1 as 0 }, NOW), /detail fetch/);
  assert.throws(() => validateCurrentSitemapEvidence({ ...evidence(), sourceDomain: "example.com" as "promoimmomarrakech.com" }, NOW), /wrong evidence source/);
});

test("batch selection requires current sitemap membership and conservative display state", () => {
  const rows = Array.from({ length: 130 }, (_, index) => candidate(index));
  rows[0] = candidate(0, { exactCrossSourceCollision: true });
  rows[1] = candidate(1, { qualityTier: "C" });
  rows[2] = candidate(2, { publicSearchPresent: false });
  const selected = selectExpansionBatch(rows, evidence(130), 50, NOW);
  assert.equal(selected.length, 100);
  assert.equal(selected.some((row) => row.canonicalUrl === candidate(0).canonicalUrl), false);
  assert.equal(selected.some((row) => row.canonicalUrl === candidate(1).canonicalUrl), false);
  assert.equal(selected.some((row) => row.canonicalUrl === candidate(2).canonicalUrl), false);
  assert.throws(() => selectExpansionBatch(rows, evidence(20), 50, NOW), /cohort too small/);
});

test("write plan preserves exact rollback and adds only sitemap freshness ownership", () => {
  const selected = Array.from({ length: 100 }, (_, index) => candidate(index));
  const seeds = new Map(selected.map((_, index) => [candidate(index).canonicalUrl, seed(index)]));
  const plan = buildExpansionWritePlan(selected, seeds, evidence(100), 50, NOW);
  assert.equal(plan.length, 100);
  assert.equal(plan.every((row) => row.batchNumber === 1), true);
  for (const row of plan) {
    assert.equal(row.before.freshnessStatus, "seed_only");
    assert.equal(row.proposed.freshnessStatus, "fresh_confirmed");
    assert.equal(row.proposed.freshChannels.includes(PROMOIMMO_CHANNEL), true);
    assert.deepEqual(row.rollback.freshChannels, ["commoncrawl_cdx"]);
    assert.equal(row.rollback.freshnessStatus, "seed_only");
    const marker = (row.proposed.metadata.freshness_evidence as Record<string, any>).controlled_expansion_batch;
    assert.equal(marker.batch_number, 1);
    assert.equal(marker.run_id, "data-4-5b-promoimmo-controlled-expansion-batch-1-v1");
  }
});

test("state drift blocks the plan before mutation", () => {
  const selected = Array.from({ length: 100 }, (_, index) => candidate(index));
  const seeds = new Map(selected.map((_, index) => [candidate(index).canonicalUrl, seed(index)]));
  seeds.set(candidate(3).canonicalUrl, { ...seed(3), freshnessStatus: "fresh_confirmed" });
  assert.throws(() => buildExpansionWritePlan(selected, seeds, evidence(100), 50, NOW), /no longer seed_only/);
});

test("post-batch certification is exact, not best-effort", () => {
  assert.doesNotThrow(() => assertPostBatchCertification({
    expectedRows: 100,
    publicSearchRows: 100,
    technicalDisplayRows: 100,
    qualityTierABRows: 100,
    projectionRows: 100,
    exactCollisionRows: 0,
  }));
  assert.throws(() => assertPostBatchCertification({
    expectedRows: 100,
    publicSearchRows: 99,
    technicalDisplayRows: 100,
    qualityTierABRows: 100,
    projectionRows: 100,
    exactCollisionRows: 0,
  }), /Search certification drift/);
});
