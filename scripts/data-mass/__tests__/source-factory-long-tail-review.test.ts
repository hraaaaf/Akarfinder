import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CertifiedSourceFactoryCohortManifest } from "../source-factory-certified-cohort";
import { validateLongTailReviewManifest, type LongTailReviewManifest } from "../source-factory-long-tail-review";

const root = process.cwd();
const cohort = JSON.parse(fs.readFileSync(path.join(root, "data/data-mass-2a/mass-1-certified-source-factory.json"), "utf8")) as CertifiedSourceFactoryCohortManifest;
const review = JSON.parse(fs.readFileSync(path.join(root, "data/data-mass-2d/long-tail-source-review.json"), "utf8")) as LongTailReviewManifest;
const certified = cohort.cohort.slice(50, 101).map(({ rank, sourceDomain, massPotentialScore }) => ({ rank, sourceDomain, massPotentialScore }));

describe("MASS-2D long-tail review", () => {
  it("locks ranks 51-101, scores, 9/42 decisions and safety boundary", () => {
    expect(() => validateLongTailReviewManifest(review, certified, "2026-08-13T00:30:00.000Z")).not.toThrow();
    expect(review.records).toHaveLength(51);
    expect(review.records[0].rank).toBe(51);
    expect(review.records.at(-1)?.rank).toBe(101);
    expect(review.records.filter((r) => r.decision === "PERMISSION_REQUIRED")).toHaveLength(9);
    expect(review.records.filter((r) => r.decision === "HOLD")).toHaveLength(42);
    expect(review.records.filter((r) => r.publicIndexingMode === "CANONICAL_LINK_ONLY_CANDIDATE")).toHaveLength(9);
    expect(review.summary).toMatchObject({
      totalUrlRepresentations: 2028,
      totalLikelyMoroccoRealEstateUrls: 1889,
      totalLikelyMoroccoListingDetailUrls: 96,
      directAcquisitionAllowed: 0,
      canonicalLinkApproved: 0,
      publicActivableNow: 0,
    });
  });

  it("fails closed when a HOLD is silently promoted", () => {
    const copy = structuredClone(review);
    const record = copy.records.find((r) => r.decision === "HOLD")!;
    record.publicIndexingMode = "CANONICAL_LINK_ONLY_CANDIDATE";
    expect(() => validateLongTailReviewManifest(copy, certified, "2026-08-13T00:30:00.000Z")).toThrow(/HOLD_BOUNDARY/);
  });
});
