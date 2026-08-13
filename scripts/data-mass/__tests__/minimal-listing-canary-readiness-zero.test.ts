import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCanaryReadiness } from "../minimal-listing-canary-readiness";

test("no policy-admissible source cannot enter canary review", () => {
  const result = evaluateCanaryReadiness({
    policyAdmissibleRegistryRows: 0,
    projectableRepresentations: 0,
    explicitHumanApproval: false,
  });
  assert.equal(result.status, "BLOCKED_NO_POLICY_ADMISSIBLE_SOURCE");
  assert.equal(result.canaryCandidates, 0);
  assert.equal(result.productionWriteAuthorizedByThisLot, false);
});
