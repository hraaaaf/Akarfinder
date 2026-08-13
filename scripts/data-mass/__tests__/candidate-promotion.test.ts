import test from "node:test";
import assert from "node:assert/strict";
import { buildCandidatePromotionManifest, summarizeCandidatePromotion } from "../candidate-promotion";

test("MASS-X1 keeps policy-compatible tail separate from blocked candidates", () => {
  const rows = buildCandidatePromotionManifest([
    { sourceDomain: "allowed.ma", massQueue: "POLICY_COMPATIBLE_TAIL", likelyMoroccoListingDetailUrls: 7 },
    { sourceDomain: "blocked.ma", massQueue: "SOURCE_FACTORY", likelyMoroccoListingDetailUrls: 11 },
    { sourceDomain: "empty.ma", massQueue: "POLICY_COMPATIBLE_TAIL", likelyMoroccoListingDetailUrls: 0 },
  ]);
  assert.deepEqual(rows.map((row) => [row.sourceDomain, row.promotionStatus]), [
    ["blocked.ma", "POLICY_BLOCKED"],
    ["allowed.ma", "POLICY_ADMISSIBLE"],
  ]);
  assert.deepEqual(summarizeCandidatePromotion(rows), {
    candidateUrlRepresentations: 18,
    policyAdmissibleUrlRepresentations: 7,
    policyBlockedUrlRepresentations: 11,
    candidateDomains: 2,
    policyAdmissibleDomains: 1,
    policyBlockedDomains: 1,
  });
});

test("MASS-X1 never treats SOURCE_FACTORY discovery as authorization", () => {
  const rows = buildCandidatePromotionManifest([
    { sourceDomain: "mass.ma", massQueue: "SOURCE_FACTORY", likelyMoroccoListingDetailUrls: 24505 },
  ]);
  const summary = summarizeCandidatePromotion(rows);
  assert.equal(summary.policyAdmissibleUrlRepresentations, 0);
  assert.equal(summary.policyBlockedUrlRepresentations, 24505);
});
