export type GrowthLane = "ADMISSIBLE_GROWTH" | "PARTNERSHIP_UPSIDE" | "HOLD";

export interface ReservoirMetrics {
  sourceDomain: string;
  normalizedRows: number;
  normalizedOk: number;
  unavailableRows: number;
  freshConfirmed: number;
  withCity: number;
  withPrice: number;
  withSurface: number;
  coreStructured: number;
  decisionStructured: number;
  technicalDisplayRows: number;
  avgQualityScore: number;
  authorizationStatus: string | null;
  acquisitionMode: string | null;
  displayPolicy: string | null;
  displayGate: string | null;
  allowedDiscoveryChannels: string[];
  structureScore: number | null;
  executionScore: number | null;
}

export interface ReservoirPriority extends ReservoirMetrics {
  lane: GrowthLane;
  realEstateStructureRatio: number;
  freshnessRatio: number;
  decisionUtilityRatio: number;
  admissibleScore: number;
  partnershipScore: number;
  publicActivableNow: false;
  recommendedNextAction: string;
}

const PARTNERSHIP_MIN_RESERVOIR_ROWS = 500;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? clamp01(numerator / denominator) : 0;
}

function volumeScore(rows: number): number {
  if (rows <= 0) return 0;
  return clamp01(Math.log10(rows + 1) / 4);
}

function policyAdmissibility(row: ReservoirMetrics): number {
  if (row.displayGate === "external_tail_link_only" && row.displayPolicy === "canonical_link_only") return 1;
  if (row.displayGate === "hidden" && row.displayPolicy === "internal_signal_only") return 0;
  return 0;
}

function partnershipPolicyNeed(row: ReservoirMetrics): number {
  if (row.authorizationStatus === "prohibited") return 0;
  if (row.normalizedRows < PARTNERSHIP_MIN_RESERVOIR_ROWS) return 0;
  if (row.displayGate === "hidden" || row.displayPolicy === "internal_signal_only") return 1;
  if (row.authorizationStatus === "permission_required") return 0.8;
  return 0.4;
}

export function prioritizeReservoir(row: ReservoirMetrics): ReservoirPriority {
  const structure = ratio(row.coreStructured, row.normalizedRows);
  const freshness = ratio(row.freshConfirmed, row.normalizedRows);
  const decisionUtility = ratio(row.decisionStructured, row.normalizedRows);
  const quality = clamp01(row.avgQualityScore / 100);
  const volume = volumeScore(row.normalizedRows);
  const connectability = clamp01((row.structureScore ?? 0) / 20);
  const admissibility = policyAdmissibility(row);
  const partnerNeed = partnershipPolicyNeed(row);

  // Immediate lane rewards scale + truthful structure + a currently admissible canonical-link mode.
  const admissibleScore = 100 * (
    0.33 * volume +
    0.27 * structure +
    0.12 * freshness +
    0.08 * decisionUtility +
    0.08 * quality +
    0.12 * connectability
  ) * admissibility;

  // Partnership lane targets reservoirs that can materially move national coverage.
  // Small high-quality catalogs remain useful long-tail candidates, but cannot win this scale-oriented lane.
  const partnershipScore = 100 * (
    0.25 * volume +
    0.20 * structure +
    0.20 * freshness +
    0.20 * decisionUtility +
    0.10 * quality +
    0.05 * connectability
  ) * partnerNeed;

  let lane: GrowthLane = "HOLD";
  if (admissibleScore >= 35) lane = "ADMISSIBLE_GROWTH";
  else if (partnershipScore >= 25) lane = "PARTNERSHIP_UPSIDE";

  const recommendedNextAction = lane === "ADMISSIBLE_GROWTH"
    ? "Audit bounded canonical-link tail activation using existing public-sitemap observations only; no content reuse or direct detail fetch."
    : lane === "PARTNERSHIP_UPSIDE"
      ? "Prioritize written partnership/feed outreach; keep current corpus internal-only until explicit authorization changes the Registry."
      : "Hold. Do not spend scale-oriented engineering capacity until volume, freshness, structure, or policy improves.";

  return {
    ...row,
    lane,
    realEstateStructureRatio: structure,
    freshnessRatio: freshness,
    decisionUtilityRatio: decisionUtility,
    admissibleScore: Number(admissibleScore.toFixed(2)),
    partnershipScore: Number(partnershipScore.toFixed(2)),
    publicActivableNow: false,
    recommendedNextAction,
  };
}

export function rankReservoirs(rows: ReservoirMetrics[]): {
  admissibleGrowth: ReservoirPriority[];
  partnershipUpside: ReservoirPriority[];
  hold: ReservoirPriority[];
} {
  const prioritized = rows.map(prioritizeReservoir);
  const byAdmissible = (a: ReservoirPriority, b: ReservoirPriority) => b.admissibleScore - a.admissibleScore || b.normalizedRows - a.normalizedRows || a.sourceDomain.localeCompare(b.sourceDomain);
  const byPartner = (a: ReservoirPriority, b: ReservoirPriority) => b.partnershipScore - a.partnershipScore || b.normalizedRows - a.normalizedRows || b.decisionStructured - a.decisionStructured || a.sourceDomain.localeCompare(b.sourceDomain);
  return {
    admissibleGrowth: prioritized.filter((row) => row.lane === "ADMISSIBLE_GROWTH").sort(byAdmissible),
    partnershipUpside: prioritized.filter((row) => row.lane === "PARTNERSHIP_UPSIDE").sort(byPartner),
    hold: prioritized.filter((row) => row.lane === "HOLD").sort((a, b) => Math.max(b.admissibleScore, b.partnershipScore) - Math.max(a.admissibleScore, a.partnershipScore)),
  };
}
