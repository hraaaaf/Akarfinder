import test from "node:test";
import assert from "node:assert/strict";
import { reclassifyMassListing } from "../mass-reclassification";

test("high quality never grants permission", () => {
  const r = reclassifyMassListing({ policyAdmissible: false, hasCanonicalUrl: true, hasReliableStructuralSignal: true, qualityScore: 100 });
  assert.equal(r.status, "POLICY_BLOCKED");
  assert.equal(r.permissionInferredFromQuality, false);
  assert.equal(r.productionWriteAuthorizedByThisLot, false);
});

test("low quality does not erase otherwise admissible structure", () => {
  const r = reclassifyMassListing({ policyAdmissible: true, hasCanonicalUrl: true, hasReliableStructuralSignal: true, qualityScore: 10 });
  assert.equal(r.status, "ELIGIBLE_LOW_QUALITY");
  assert.equal(r.qualityControlsEligibility, false);
});

test("missing structural requirements reject independently of quality", () => {
  const r = reclassifyMassListing({ policyAdmissible: true, hasCanonicalUrl: false, hasReliableStructuralSignal: true, qualityScore: 100 });
  assert.equal(r.status, "STRUCTURAL_REJECT");
});

test("standard quality remains read-only classification", () => {
  const r = reclassifyMassListing({ policyAdmissible: true, hasCanonicalUrl: true, hasReliableStructuralSignal: true, qualityScore: 75 });
  assert.equal(r.status, "ELIGIBLE_STANDARD_QUALITY");
  assert.equal(r.displayEligibleByThisLot, false);
  assert.equal(r.productionWriteAuthorizedByThisLot, false);
});
