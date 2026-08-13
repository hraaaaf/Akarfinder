export type CanaryReadinessInput = {
  policyAdmissibleRegistryRows: number;
  projectableRepresentations: number;
  explicitHumanApproval: boolean;
};

export type CanaryReadinessStatus =
  | "BLOCKED_NO_POLICY_ADMISSIBLE_SOURCE"
  | "BLOCKED_NO_PROJECTABLE_REPRESENTATION"
  | "BLOCKED_HUMAN_APPROVAL_REQUIRED"
  | "READY_FOR_SEPARATE_CANARY_REVIEW";

function assertCount(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name}_INVALID`);
  }
}

export function evaluateCanaryReadiness(input: CanaryReadinessInput) {
  assertCount("POLICY_ADMISSIBLE_REGISTRY_ROWS", input.policyAdmissibleRegistryRows);
  assertCount("PROJECTABLE_REPRESENTATIONS", input.projectableRepresentations);

  let status: CanaryReadinessStatus;
  if (input.policyAdmissibleRegistryRows === 0) {
    status = "BLOCKED_NO_POLICY_ADMISSIBLE_SOURCE";
  } else if (input.projectableRepresentations === 0) {
    status = "BLOCKED_NO_PROJECTABLE_REPRESENTATION";
  } else if (!input.explicitHumanApproval) {
    status = "BLOCKED_HUMAN_APPROVAL_REQUIRED";
  } else {
    status = "READY_FOR_SEPARATE_CANARY_REVIEW";
  }

  return {
    status,
    canaryCandidates: status === "READY_FOR_SEPARATE_CANARY_REVIEW"
      ? Math.min(input.policyAdmissibleRegistryRows, input.projectableRepresentations)
      : 0,
    productionWriteAuthorizedByThisLot: false,
    searchActivationAuthorizedByThisLot: false,
    permissionInferred: false,
  } as const;
}
