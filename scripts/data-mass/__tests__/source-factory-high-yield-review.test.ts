import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import type { CertifiedSourceFactoryCohortManifest } from "../source-factory-certified-cohort";
import {
  validateHighYieldReviewManifest,
  type HighYieldReviewManifest,
} from "../source-factory-high-yield-review";

const COHORT_PATH = "data/data-mass-2a/mass-1-certified-source-factory.json";
const REVIEW_PATH = "data/data-mass-2b/high-yield-source-review.json";
const NOW = "2026-08-12T21:00:00.000Z";

function cohort(): CertifiedSourceFactoryCohortManifest {
  return JSON.parse(fs.readFileSync(COHORT_PATH, "utf8")) as CertifiedSourceFactoryCohortManifest;
}

function review(): HighYieldReviewManifest {
  return JSON.parse(fs.readFileSync(REVIEW_PATH, "utf8")) as HighYieldReviewManifest;
}

function certifiedHighYield() {
  return cohort().cohort.slice(0, 20).map(({ rank, sourceDomain, massPotentialScore }) => ({
    rank,
    sourceDomain,
    massPotentialScore,
  }));
}

test("MASS-2B reviews exactly the certified top 20 in immutable rank order", () => {
  const manifest = review();
  validateHighYieldReviewManifest(manifest, certifiedHighYield(), NOW);
  assert.equal(manifest.records.length, 20);
  assert.deepEqual(
    manifest.records.map((record) => record.sourceDomain),
    certifiedHighYield().map((entry) => entry.sourceDomain),
  );
});

test("MASS-2B stays fail-closed: 17 permission-required, 3 hold, zero active capability", () => {
  const manifest = review();
  validateHighYieldReviewManifest(manifest, certifiedHighYield(), NOW);
  assert.equal(manifest.records.filter((record) => record.decision === "PERMISSION_REQUIRED").length, 17);
  assert.equal(manifest.records.filter((record) => record.decision === "HOLD").length, 3);
  assert.equal(manifest.safety.allowedChannels, "NONE_ONLY");
  assert.equal(manifest.safety.directAcquisitionAllowed, false);
  assert.equal(manifest.safety.publicActivableNow, false);
  assert.equal(manifest.safety.registryWriteAllowed, false);
  assert.equal(manifest.safety.permissionInferred, false);
});

test("attributed minimal indexing is a separate candidate axis, never implicit permission", () => {
  const manifest = review();
  validateHighYieldReviewManifest(manifest, certifiedHighYield(), NOW);
  const permissionRequired = manifest.records.filter((record) => record.decision === "PERMISSION_REQUIRED");
  const holds = manifest.records.filter((record) => record.decision === "HOLD");
  assert.ok(permissionRequired.every((record) => record.publicIndexingMode === "CANONICAL_LINK_ONLY_CANDIDATE"));
  assert.ok(holds.every((record) => record.publicIndexingMode === "UNRESOLVED"));
  assert.equal(manifest.safety.canonicalLinkCandidateRequiresSeparateBaseline, true);
  assert.equal(manifest.safety.sourceAttributionRequired, true);
  assert.equal(manifest.safety.copyPhotosAllowed, false);
  assert.equal(manifest.safety.copyDescriptionAllowed, false);
  assert.equal(manifest.summary.canonicalLinkApproved, 0);
});

test("permission-required decisions require current official terms evidence", () => {
  const manifest = review();
  validateHighYieldReviewManifest(manifest, certifiedHighYield(), NOW);
  const broken = structuredClone(manifest);
  broken.records[0].termsUrl = null;
  assert.throws(
    () => validateHighYieldReviewManifest(broken, certifiedHighYield(), NOW),
    /MISSING_TERMS_EVIDENCE/,
  );
});

test("a HOLD cannot be silently promoted to canonical-link candidate", () => {
  const manifest = review();
  const broken = structuredClone(manifest);
  const target = broken.records.find((record) => record.sourceDomain === "2p.ma");
  assert.ok(target);
  target.publicIndexingMode = "CANONICAL_LINK_ONLY_CANDIDATE";
  assert.throws(
    () => validateHighYieldReviewManifest(broken, certifiedHighYield(), NOW),
    /HOLD_MUST_BE_UNRESOLVED/,
  );
});

test("certified rank and score drift fail closed", () => {
  const manifest = review();
  const broken = structuredClone(manifest);
  broken.records[0].massPotentialScore += 0.01;
  assert.throws(
    () => validateHighYieldReviewManifest(broken, certifiedHighYield(), NOW),
    /SCORE_DRIFT/,
  );
});
