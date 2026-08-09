import { isConservativePromoImmoCanaryCandidate, type PromoImmoCandidate } from "./promoimmo-sitemap-canary";

export const PROMOIMMO_EXPANSION_TARGET_TOTAL = 500 as const;
export const PROMOIMMO_EXPANSION_BASELINE = 50 as const;
export const PROMOIMMO_EXPANSION_REQUIRED_NEW = 450 as const;
export const PROMOIMMO_EXPANSION_BATCH_SIZES = [100, 100, 100, 100, 50] as const;

export type PromoImmoExpansionCandidate = PromoImmoCandidate & {
  alreadySitemapConfirmed: boolean;
};

export type PromoImmoExpansionQualification = {
  targetTotal: number;
  baselineRows: number;
  requiredNewRows: number;
  eligibleNewRows: number;
  selectedRows: PromoImmoExpansionCandidate[];
  batchSizes: readonly number[];
  qualified: boolean;
};

export function isPromoImmoExpansionCandidate(candidate: PromoImmoExpansionCandidate): boolean {
  return !candidate.alreadySitemapConfirmed && isConservativePromoImmoCanaryCandidate(candidate);
}

export function qualifyPromoImmoExpansion(
  candidates: PromoImmoExpansionCandidate[],
  baselineRows: number,
): PromoImmoExpansionQualification {
  if (baselineRows !== PROMOIMMO_EXPANSION_BASELINE) {
    throw new Error(`Expected certified Promo Immo baseline ${PROMOIMMO_EXPANSION_BASELINE}, got ${baselineRows}`);
  }

  const eligible = candidates
    .filter(isPromoImmoExpansionCandidate)
    .sort((a, b) => b.qualityScore! - a.qualityScore! || a.canonicalUrl.localeCompare(b.canonicalUrl));

  const selectedRows = eligible.slice(0, PROMOIMMO_EXPANSION_REQUIRED_NEW);
  return {
    targetTotal: PROMOIMMO_EXPANSION_TARGET_TOTAL,
    baselineRows,
    requiredNewRows: PROMOIMMO_EXPANSION_REQUIRED_NEW,
    eligibleNewRows: eligible.length,
    selectedRows,
    batchSizes: PROMOIMMO_EXPANSION_BATCH_SIZES,
    qualified: selectedRows.length === PROMOIMMO_EXPANSION_REQUIRED_NEW,
  };
}

export function requireQualifiedPromoImmoExpansion(result: PromoImmoExpansionQualification): void {
  const batchTotal = result.batchSizes.reduce((sum, size) => sum + size, 0);
  if (batchTotal !== result.requiredNewRows) throw new Error(`Expansion batch total mismatch: ${batchTotal}`);
  if (!result.qualified || result.selectedRows.length !== result.requiredNewRows) {
    throw new Error(`Promo Immo expansion not qualified: need ${result.requiredNewRows}, got ${result.selectedRows.length}`);
  }
  if (new Set(result.selectedRows.map((row) => row.canonicalUrl)).size !== result.selectedRows.length) {
    throw new Error("Promo Immo expansion cohort contains duplicate canonical URLs");
  }
}
