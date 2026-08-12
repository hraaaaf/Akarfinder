import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import type { CertifiedSourceFactoryCohortManifest } from "../source-factory-certified-cohort";
import { validateLongTailReviewManifest, type LongTailReviewManifest } from "../source-factory-long-tail-review";

const root = process.cwd();
const cohort = JSON.parse(fs.readFileSync(path.join(root, "data/data-mass-2a/mass-1-certified-source-factory.json"), "utf8")) as CertifiedSourceFactoryCohortManifest;
const review = JSON.parse(fs.readFileSync(path.join(root, "data/data-mass-2d/long-tail-source-review.json"), "utf8")) as LongTailReviewManifest;
const certified = cohort.cohort.slice(50, 101).map(({ rank, sourceDomain, massPotentialScore }) => ({ rank, sourceDomain, massPotentialScore }));

test("MASS-2D locks ranks 51-101, scores, 9/42 decisions and safety boundary", () => {
  assert.doesNotThrow(() => validateLongTailReviewManifest(review, certified, "2026-08-13T00:30:00.000Z"));
  assert.equal(review.records.length, 51);
  assert.equal(review.records[0].rank, 51);
  assert.equal(review.records.at(-1)?.rank, 101);
  assert.equal(review.records.filter((r) => r.decision === "PERMISSION_REQUIRED").length, 9);
  assert.equal(review.records.filter((r) => r.decision === "HOLD").length, 42);
  assert.equal(review.records.filter((r) => r.publicIndexingMode === "CANONICAL_LINK_ONLY_CANDIDATE").length, 9);
  assert.deepEqual(
    {
      totalUrlRepresentations: review.summary.totalUrlRepresentations,
      totalLikelyMoroccoRealEstateUrls: review.summary.totalLikelyMoroccoRealEstateUrls,
      totalLikelyMoroccoListingDetailUrls: review.summary.totalLikelyMoroccoListingDetailUrls,
      directAcquisitionAllowed: review.summary.directAcquisitionAllowed,
      canonicalLinkApproved: review.summary.canonicalLinkApproved,
      publicActivableNow: review.summary.publicActivableNow,
    },
    {
      totalUrlRepresentations: 2028,
      totalLikelyMoroccoRealEstateUrls: 1889,
      totalLikelyMoroccoListingDetailUrls: 96,
      directAcquisitionAllowed: 0,
      canonicalLinkApproved: 0,
      publicActivableNow: 0,
    },
  );
});

test("MASS-2D fails closed when a HOLD is silently promoted", () => {
  const copy = structuredClone(review);
  const record = copy.records.find((r) => r.decision === "HOLD");
  assert.ok(record);
  record.publicIndexingMode = "CANONICAL_LINK_ONLY_CANDIDATE";
  assert.throws(() => validateLongTailReviewManifest(copy, certified, "2026-08-13T00:30:00.000Z"), /HOLD_BOUNDARY/);
});
