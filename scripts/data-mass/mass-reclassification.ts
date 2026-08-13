export type MassReclassificationInput = {
  policyAdmissible: boolean;
  hasCanonicalUrl: boolean;
  hasReliableStructuralSignal: boolean;
  qualityScore: number;
};

export type MassReclassificationStatus =
  | "POLICY_BLOCKED"
  | "STRUCTURAL_REJECT"
  | "ELIGIBLE_LOW_QUALITY"
  | "ELIGIBLE_STANDARD_QUALITY";

export function reclassifyMassListing(input: MassReclassificationInput) {
  if (!Number.isFinite(input.qualityScore) || input.qualityScore < 0 || input.qualityScore > 100) {
    throw new Error("QUALITY_SCORE_INVALID");
  }

  let status: MassReclassificationStatus;
  if (!input.policyAdmissible) {
    status = "POLICY_BLOCKED";
  } else if (!input.hasCanonicalUrl || !input.hasReliableStructuralSignal) {
    status = "STRUCTURAL_REJECT";
  } else if (input.qualityScore < 50) {
    status = "ELIGIBLE_LOW_QUALITY";
  } else {
    status = "ELIGIBLE_STANDARD_QUALITY";
  }

  return {
    status,
    displayEligibleByThisLot: false,
    productionWriteAuthorizedByThisLot: false,
    permissionInferredFromQuality: false,
    qualityControlsEligibility: false,
  } as const;
}
