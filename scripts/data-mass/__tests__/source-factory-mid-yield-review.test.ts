import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import type { CertifiedSourceFactoryCohortManifest } from "../source-factory-certified-cohort";
import {
  validateMidYieldReviewManifest,
  type MidYieldReviewManifest,
} from "../source-factory-mid-yield-review";

const COHORT_PATH = "data/data-mass-2a/mass-1-certified-source-factory.json";
const REVIEW_PATH = "data/data-mass-2c/mid-yield-source-review.json";
const NOW = "2026-08-12T22:30:00.000Z";

function cohort(): CertifiedSourceFactoryCohortManifest {
  return JSON.parse(fs.readFileSync(COHORT_PATH, "utf8")) as CertifiedSourceFactoryCohortManifest;
}
function review(): MidYieldReviewManifest {
  return JSON.parse(fs.readFileSync(REVIEW_PATH, "utf8")) as MidYieldReviewManifest;
}
function certifiedMidYield() {
  return cohort().cohort.slice(20, 50).map(({ rank, sourceDomain, massPotentialScore }) => ({ rank, sourceDomain, massPotentialScore }));
}

test("MASS-2C reviews exactly certified ranks 21-50", () => {
  const manifest = review();
  validateMidYieldReviewManifest(manifest, certifiedMidYield(), NOW);
  assert.equal(manifest.records.length, 30);
  assert.deepEqual(manifest.records.map((r) => r.rank), Array.from({ length: 30 }, (_, index) => index + 21));
  assert.deepEqual(manifest.records.map((r) => r.sourceDomain), certifiedMidYield().map((r) => r.sourceDomain));
  assert.equal(new Set(manifest.records.map((r) => r.sourceDomain)).size, 30);
});

test("MASS-2C is fail-closed at 17 permission-required / 13 hold", () => {
  const manifest = review();
  validateMidYieldReviewManifest(manifest, certifiedMidYield(), NOW);
  assert.equal(manifest.records.filter((r) => r.decision === "PERMISSION_REQUIRED").length, 17);
  assert.equal(manifest.records.filter((r) => r.decision === "HOLD").length, 13);
  assert.equal(manifest.records.filter((r) => r.publicIndexingMode === "CANONICAL_LINK_ONLY_CANDIDATE").length, 17);
  assert.equal(manifest.summary.canonicalLinkApproved, 0);
  assert.equal(manifest.safety.directAcquisitionAllowed, false);
  assert.equal(manifest.safety.publicActivableNow, false);
  assert.equal(manifest.safety.registryWriteAllowed, false);
});

test("MASS-2C preserves certified yield totals", () => {
  const manifest = review();
  validateMidYieldReviewManifest(manifest, certifiedMidYield(), NOW);
  assert.equal(manifest.summary.totalUrlRepresentations, 3026);
  assert.equal(manifest.summary.totalLikelyMoroccoRealEstateUrls, 1758);
  assert.equal(manifest.summary.totalLikelyMoroccoListingDetailUrls, 967);
});

test("resolved policy refinements are explicit and 2ememain remains HOLD", () => {
  const manifest = review();
  const properstar = manifest.records.find((r) => r.sourceDomain === "properstar.fr");
  const acropole = manifest.records.find((r) => r.sourceDomain === "acropole-immo.net");
  const secondhand = manifest.records.find((r) => r.sourceDomain === "2ememain.be");
  assert.equal(properstar?.decision, "PERMISSION_REQUIRED");
  assert.equal(properstar?.termsStatus, "NO_PUBLIC_REUSE_GRANT_FOUND");
  assert.equal(acropole?.decision, "PERMISSION_REQUIRED");
  assert.equal(acropole?.termsStatus, "NO_PUBLIC_REUSE_GRANT_FOUND");
  assert.equal(secondhand?.decision, "HOLD");
  assert.equal(secondhand?.termsStatus, "TERMS_UNRESOLVED");
});

test("permission-required needs policy evidence", () => {
  const broken = structuredClone(review());
  const target = broken.records.find((r) => r.sourceDomain === "properstar.fr");
  assert.ok(target);
  target.termsUrl = null;
  assert.throws(() => validateMidYieldReviewManifest(broken, certifiedMidYield(), NOW), /MISSING_TERMS_EVIDENCE/);
});

test("HOLD cannot silently become a canonical-link candidate", () => {
  const broken = structuredClone(review());
  const target = broken.records.find((r) => r.sourceDomain === "2ememain.be");
  assert.ok(target);
  target.publicIndexingMode = "CANONICAL_LINK_ONLY_CANDIDATE";
  assert.throws(() => validateMidYieldReviewManifest(broken, certifiedMidYield(), NOW), /HOLD_BOUNDARY_VIOLATED/);
});

test("rank, predecessor, time and yield drift fail closed", () => {
  const scoreDrift = structuredClone(review());
  scoreDrift.records[0].massPotentialScore += 0.01;
  assert.throws(() => validateMidYieldReviewManifest(scoreDrift, certifiedMidYield(), NOW), /SCORE_DRIFT/);

  const predecessorDrift = structuredClone(review());
  predecessorDrift.predecessor.mass2bFinalArtifactDigest = "sha256:wrong";
  assert.throws(() => validateMidYieldReviewManifest(predecessorDrift, certifiedMidYield(), NOW), /MASS2B_ARTIFACT_DIGEST_DRIFT/);

  const future = structuredClone(review());
  future.reviewedAt = "2026-08-13T00:00:00.000Z";
  assert.throws(() => validateMidYieldReviewManifest(future, certifiedMidYield(), NOW), /INVALID_REVIEW_TIME/);

  const yieldDrift = structuredClone(review());
  yieldDrift.records[0].yield.urlRepresentations += 1;
  assert.throws(() => validateMidYieldReviewManifest(yieldDrift, certifiedMidYield(), NOW), /YIELD_TOTAL_DRIFT/);
});
