export type ThinIndexServingPolicyRow = {
  canonical_url: string;
  seed_provider: string;
  freshness_status: string;
  quality_tier: string | null;
  display_eligibility: string | null;
  ranking_quality_boost: number | null;
  relevance_rank: number;
  updated_at: string;
  seed_id: string;
};

const ALLOWED_PROVIDERS = new Set(["public_sitemap", "commoncrawl_cdx", "serper_search"]);
const ALLOWED_FRESHNESS = new Set(["seed_only", "fresh_confirmed"]);
const ALLOWED_ELIGIBILITY = new Set(["eligible_primary", "eligible_secondary"]);

export function isThinIndexRowDisplayEligible(row: ThinIndexServingPolicyRow): boolean {
  if (!row.canonical_url?.trim()) return false;
  if (!ALLOWED_PROVIDERS.has(row.seed_provider)) return false;
  if (!ALLOWED_FRESHNESS.has(row.freshness_status)) return false;
  if (!ALLOWED_ELIGIBILITY.has(row.display_eligibility ?? "")) return false;
  const boost = row.ranking_quality_boost ?? 0;
  return Number.isFinite(boost) && boost >= 0 && boost <= 0.35;
}

function eligibilityWeight(value: string | null): number {
  return value === "eligible_primary" ? 0 : value === "eligible_secondary" ? 1 : 2;
}

export function compareThinIndexEligibility(
  left: ThinIndexServingPolicyRow,
  right: ThinIndexServingPolicyRow,
): number {
  const eligibility = eligibilityWeight(left.display_eligibility) - eligibilityWeight(right.display_eligibility);
  if (eligibility !== 0) return eligibility;
  if (left.relevance_rank !== right.relevance_rank) return right.relevance_rank - left.relevance_rank;
  const updated = Date.parse(right.updated_at) - Date.parse(left.updated_at);
  if (updated !== 0) return updated;
  return right.seed_id.localeCompare(left.seed_id);
}
