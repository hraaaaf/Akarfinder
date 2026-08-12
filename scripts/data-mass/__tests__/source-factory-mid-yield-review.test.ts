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
const NOW = "2026-08-12T21:30:00.000Z";

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
  assert.equal(manifest.records[0].rank, 21);
  assert.equal(manifest.records[29].rank, 50);
  assert.deepEqual(manifest.records.map((r) => r.sourceDomain), certifiedMidYield().map((r) => r.sourceDomain));
});

test("MASS-2C is fail-closed at 16 permission-required / 14 hold", () => {
  const manifest = review();
  validateMidYieldReviewManifest(manifest, certifiedMidYield(), NOW);
  assert.equal(manifest.records.filter((r) => r.decision === "PERMISSION_REQUIRED").length, 16);
  assert.equal(manifest.records.filter((r) => r.decision === "HOLD").length, 14);
  assert.equal(manifest.summary.canonicalLinkApproved, 0);
  assert.equal(manifest.safety.directAcquisitionAllowed, false);
  assert.equal(manifest.safety.publicActivableNow, false);
  assert.equal(manifest.safety.registryWriteAllowed, false);
});

test("canonical-link-only remains a candidate axis, never activation", () => {
  const manifest = review();
  validateMidYieldReviewManifest(manifest, certifiedMidYield(), NOW);
  assert.equal(manifest.records.filter((r) => r.publicIndexingMode === "CANONICAL_LINK_ONLY_CANDIDATE").length, 16);
  assert.ok(manifest.records.filter((r) => r.decision === "HOLD").every((r) => r.publicIndexingMode === "UNRESOLVED"));
  assert.equal(manifest.safety.sourceAttributionRequired, true);
  assert.equal(manifest.safety.copyPhotosAllowed, false);
  assert.equal(manifest.safety.copyDescriptionAllowed, false);
});

test("permission-required needs official terms evidence", () => {
  const manifest = review();
  const broken = structuredClone(manifest);
  const target = broken.records.find((r) => r.sourceDomain === "paruvendu.fr");
  assert.ok(target);
  target.termsUrl = null;
  assert.throws(() => validateMidYieldReviewManifest(broken, certifiedMidYield(), NOW), /MISSING_TERMS_EVIDENCE/);
});

test("HOLD cannot silently become a canonical-link candidate", () => {
  const manifest = review();
  const broken = structuredClone(manifest);
  const target = broken.records.find((r) => r.sourceDomain === "fazwaz.fr");
  assert.ok(target);
  target.publicIndexingMode = "CANONICAL_LINK_ONLY_CANDIDATE";
  assert.throws(() => validateMidYieldReviewManifest(broken, certifiedMidYield(), NOW), /HOLD_BOUNDARY_VIOLATED/);
});

test("rank and score drift fail closed", () => {
  const manifest = review();
  const broken = structuredClone(manifest);
  broken.records[0].massPotentialScore += 0.01;
  assert.throws(() => validateMidYieldReviewManifest(broken, certifiedMidYield(), NOW), /SCORE_DRIFT/);
});
