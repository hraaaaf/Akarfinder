import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCanaryReadiness } from "../minimal-listing-canary-readiness";

test("MASS-3C readiness stays fail-closed across every transition", () => {
  const noPolicy = evaluateCanaryReadiness({ policyAdmissibleRegistryRows: 0, projectableRepresentations: 0, explicitHumanApproval: false });
  assert.equal(noPolicy.status, "BLOCKED_NO_POLICY_ADMISSIBLE_SOURCE");
  assert.equal(noPolicy.canaryCandidates, 0);

  const noProjection = evaluateCanaryReadiness({ policyAdmissibleRegistryRows: 1, projectableRepresentations: 0, explicitHumanApproval: false });
  assert.equal(noProjection.status, "BLOCKED_NO_PROJECTABLE_REPRESENTATION");

  const noApproval = evaluateCanaryReadiness({ policyAdmissibleRegistryRows: 1, projectableRepresentations: 1, explicitHumanApproval: false });
  assert.equal(noApproval.status, "BLOCKED_HUMAN_APPROVAL_REQUIRED");
  assert.equal(noApproval.canaryCandidates, 0);

  const reviewOnly = evaluateCanaryReadiness({ policyAdmissibleRegistryRows: 2, projectableRepresentations: 3, explicitHumanApproval: true });
  assert.equal(reviewOnly.status, "READY_FOR_SEPARATE_CANARY_REVIEW");
  assert.equal(reviewOnly.canaryCandidates, 2);

  for (const result of [noPolicy, noProjection, noApproval, reviewOnly]) {
    assert.equal(result.productionWriteAuthorizedByThisLot, false);
    assert.equal(result.searchActivationAuthorizedByThisLot, false);
    assert.equal(result.permissionInferred, false);
  }
});
