export const FINAL_PRODUCTION_GATE_VERSION = "1.0" as const;

export type GateStatus = "pass" | "warn" | "block";
export type GateArea = "data" | "intelligence" | "ux" | "business" | "technical" | "production";

export type LaunchReadinessCheck = {
  id: string;
  area: GateArea;
  status: GateStatus;
  summary: string;
  evidence: string[];
};

export type FinalProductionGateResult = {
  version: typeof FINAL_PRODUCTION_GATE_VERSION;
  verdict: "GO" | "NO_GO";
  blockers: LaunchReadinessCheck[];
  warnings: LaunchReadinessCheck[];
  passes: LaunchReadinessCheck[];
  checks: LaunchReadinessCheck[];
};

export function evaluateFinalProductionGate(checks: LaunchReadinessCheck[]): FinalProductionGateResult {
  const normalized = checks.map((check) => ({ ...check, evidence: [...new Set(check.evidence.filter(Boolean))] }));
  const blockers = normalized.filter((check) => check.status === "block");
  return {
    version: "1.0",
    verdict: blockers.length ? "NO_GO" : "GO",
    blockers,
    warnings: normalized.filter((check) => check.status === "warn"),
    passes: normalized.filter((check) => check.status === "pass"),
    checks: normalized,
  };
}

export function canonicalRepositoryReadinessChecks(input: {
  propertySchemaReady: boolean;
  intelligenceChainReady: boolean;
  publicationEligibilityReady: boolean;
  neighborhoodReferenceReady: boolean;
  neighborhoodNationalEnrichmentComplete: boolean;
  frenchCoreJourneyReady: boolean;
  arabicCoreJourneyReady: boolean;
  responsiveContractReady: boolean;
  partnerActivationReady: boolean;
  userContinuityReady: boolean;
  canonicalCiReady: boolean;
  databaseSecurityReady: boolean;
  productionDeploymentReady: boolean;
}): LaunchReadinessCheck[] {
  return [
    {
      id: "data-foundation",
      area: "data",
      status: input.propertySchemaReady && input.publicationEligibilityReady && input.neighborhoodReferenceReady ? "pass" : "block",
      summary: "Property Schema, publication eligibility and neighborhood reference foundations exist.",
      evidence: [input.propertySchemaReady ? "property-schema" : "missing-property-schema", input.publicationEligibilityReady ? "publication-gate" : "missing-publication-gate", input.neighborhoodReferenceReady ? "neighborhood-reference" : "missing-neighborhood-reference"],
    },
    {
      id: "national-neighborhood-enrichment",
      area: "data",
      status: input.neighborhoodNationalEnrichmentComplete ? "pass" : "warn",
      summary: input.neighborhoodNationalEnrichmentComplete ? "National neighborhood enrichment is complete." : "National neighborhood enrichment remains partial; unknown evidence must stay neutral.",
      evidence: [input.neighborhoodNationalEnrichmentComplete ? "national-enrichment-complete" : "partial-enrichment-with-neutral-unknown-policy"],
    },
    {
      id: "intelligence-chain",
      area: "intelligence",
      status: input.intelligenceChainReady ? "pass" : "block",
      summary: "Structured intelligence, AkarScore, SearchProfile, Property Fit and Companion chain is intact.",
      evidence: [input.intelligenceChainReady ? "canonical-intelligence-chain" : "incomplete-intelligence-chain"],
    },
    {
      id: "ux-french-core",
      area: "ux",
      status: input.frenchCoreJourneyReady ? "pass" : "block",
      summary: "French core journey is available.",
      evidence: [input.frenchCoreJourneyReady ? "fr-core-routes" : "fr-core-routes-missing"],
    },
    {
      id: "ux-arabic-rtl-core",
      area: "ux",
      status: input.arabicCoreJourneyReady ? "pass" : "block",
      summary: input.arabicCoreJourneyReady ? "Arabic/RTL core journey is available." : "Arabic/RTL core journey is not yet implemented end-to-end.",
      evidence: [input.arabicCoreJourneyReady ? "ar-rtl-core-routes" : "missing-ar-rtl-core-journey"],
    },
    {
      id: "responsive-contract",
      area: "ux",
      status: input.responsiveContractReady ? "pass" : "warn",
      summary: input.responsiveContractReady ? "Responsive contracts are covered." : "Responsive visual certification still requires final viewport evidence.",
      evidence: [input.responsiveContractReady ? "responsive-evidence" : "viewport-certification-pending"],
    },
    {
      id: "business-boundaries",
      area: "business",
      status: input.partnerActivationReady ? "pass" : "block",
      summary: "Partner activation is separated from organic ranking and publication authorization.",
      evidence: [input.partnerActivationReady ? "partner-commercial-activation" : "partner-activation-incomplete"],
    },
    {
      id: "user-continuity",
      area: "business",
      status: input.userContinuityReady ? "pass" : "block",
      summary: "Authenticated user continuity foundation is available.",
      evidence: [input.userContinuityReady ? "user-continuity-v1" : "user-continuity-missing"],
    },
    {
      id: "technical-gates",
      area: "technical",
      status: input.canonicalCiReady && input.databaseSecurityReady ? "pass" : "block",
      summary: "Canonical CI and database security gates must be green.",
      evidence: [input.canonicalCiReady ? "canonical-ci-green" : "canonical-ci-not-green", input.databaseSecurityReady ? "database-security-audited" : "database-security-not-audited"],
    },
    {
      id: "production-deployment",
      area: "production",
      status: input.productionDeploymentReady ? "pass" : "block",
      summary: input.productionDeploymentReady ? "Final main commit is deployed successfully to Production." : "Final main commit is not yet proven deployed successfully to Production.",
      evidence: [input.productionDeploymentReady ? "vercel-success" : "production-deployment-not-success"],
    },
  ];
}
