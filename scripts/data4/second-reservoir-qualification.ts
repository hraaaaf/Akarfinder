export type ReservoirCandidate = {
  sourceDomain: string;
  totalNormalized: number;
  normalizedOk: number;
  technicalDisplay: number;
  freshConfirmed: number;
  seedOnly: number;
  withCity: number;
  withType: number;
  withIntent: number;
  registryAcquisitionMode: string;
  registryDiscoveryPolicy: string;
  registryDisplayPolicy: string;
  registryDisplayGate: string;
  registryMachineGate: string;
  reviewStatus: string | null;
};

export type ReservoirQualification = ReservoirCandidate & {
  normalizationRate: number;
  technicalDisplayRate: number;
  geoCoverageRate: number;
  typeCoverageRate: number;
  intentCoverageRate: number;
  scaleScore: number;
  qualityScore: number;
  registryScore: number;
  reviewPenalty: number;
  totalScore: number;
  decision: "PREFERRED_PENDING_REVALIDATION" | "SECONDARY" | "BLOCKED";
};

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function registryScore(candidate: ReservoirCandidate): number {
  const canonicalLink = candidate.registryAcquisitionMode === "public_sitemap_canonical_link"
    && candidate.registryDiscoveryPolicy === "public_sitemap_only"
    && candidate.registryDisplayPolicy === "canonical_link_only"
    && candidate.registryMachineGate === "canonical_link_only";
  if (!canonicalLink) return 0;
  return candidate.registryDisplayGate === "external_tail_link_only" ? 1 : 0.6;
}

export function qualifyReservoir(candidate: ReservoirCandidate, maxRows: number): ReservoirQualification {
  const normalizationRate = ratio(candidate.normalizedOk, candidate.totalNormalized);
  const technicalDisplayRate = ratio(candidate.technicalDisplay, candidate.totalNormalized);
  const geoCoverageRate = ratio(candidate.withCity, candidate.totalNormalized);
  const typeCoverageRate = ratio(candidate.withType, candidate.totalNormalized);
  const intentCoverageRate = ratio(candidate.withIntent, candidate.totalNormalized);

  const scaleScore = clamp01(ratio(candidate.totalNormalized, maxRows));
  const qualityScore = (
    normalizationRate * 0.35
    + technicalDisplayRate * 0.30
    + geoCoverageRate * 0.15
    + typeCoverageRate * 0.10
    + intentCoverageRate * 0.10
  );
  const policyScore = registryScore(candidate);
  const reviewPenalty = candidate.reviewStatus === "overdue" ? 0.35 : candidate.reviewStatus === "due_soon" ? 0.08 : 0;
  const totalScore = Math.max(0, scaleScore * 0.45 + qualityScore * 0.35 + policyScore * 0.20 - reviewPenalty);

  const blocked = policyScore === 0 || candidate.reviewStatus === "overdue";
  return {
    ...candidate,
    normalizationRate,
    technicalDisplayRate,
    geoCoverageRate,
    typeCoverageRate,
    intentCoverageRate,
    scaleScore,
    qualityScore,
    registryScore: policyScore,
    reviewPenalty,
    totalScore,
    decision: blocked ? "BLOCKED" : "SECONDARY",
  };
}

export function rankReservoirs(candidates: ReservoirCandidate[]): ReservoirQualification[] {
  const maxRows = Math.max(1, ...candidates.map((candidate) => candidate.totalNormalized));
  const ranked = candidates
    .map((candidate) => qualifyReservoir(candidate, maxRows))
    .sort((a, b) => b.totalScore - a.totalScore || b.totalNormalized - a.totalNormalized || a.sourceDomain.localeCompare(b.sourceDomain));

  const firstEligible = ranked.find((candidate) => candidate.decision !== "BLOCKED");
  if (firstEligible) firstEligible.decision = "PREFERRED_PENDING_REVALIDATION";
  return ranked;
}
