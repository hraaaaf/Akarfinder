import type { SourceDomainRegistry } from "@/lib/openserp-ingestion/domain-registry";
import { selectRegistryMassHarvestDomains } from "@/lib/acquisition-scale-v1/commoncrawl-mass-seeds";
import type { MassIndexSourcePolicy } from "@/lib/acquisition-scale-v1/mass-index-source-policy";

export type CommonCrawlSeedCoverage = {
  source_domain: string;
  seed_count: number;
  latest_observed_at: string | null;
};

export type CommonCrawlDiscoveryCoverageState =
  | "HARVEST_READY"
  | "POLICY_ALLOWED_PATTERN_MISSING"
  | "POLICY_EXPIRED_OR_BLOCKED";

export type CommonCrawlDiscoveryCoverageRow = {
  source_domain: string;
  state: CommonCrawlDiscoveryCoverageState;
  policy_review_status: string | null;
  policy_next_review_at: string | null;
  structural_harvest_ready: boolean;
  seed_count: number;
  latest_observed_at: string | null;
};

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase();
}

function policyIsOperational(policy: MassIndexSourcePolicy, now: Date): boolean {
  if (!(policy.allowed_discovery_channels ?? []).map((channel) => channel.toLowerCase()).includes("commoncrawl")) {
    return false;
  }
  if (policy.no_bypass_required !== true || !policy.policy_hash?.trim()) return false;
  if (!(["current", "due_soon"] as const).includes(policy.review_status as "current" | "due_soon")) return false;
  if (!policy.next_review_at) return false;
  const nextReviewAt = new Date(policy.next_review_at);
  if (!Number.isFinite(nextReviewAt.getTime()) || nextReviewAt.getTime() <= now.getTime()) return false;
  if (policy.acquisition_mode === "blocked") return false;
  if (!policy.machine_gate || policy.machine_gate.startsWith("blocked")) return false;
  if (!policy.ingestion_gate || policy.ingestion_gate.startsWith("blocked")) return false;
  return true;
}

export function buildCommonCrawlDiscoveryCoverage(
  policies: MassIndexSourcePolicy[],
  registry: SourceDomainRegistry,
  seedCoverage: CommonCrawlSeedCoverage[],
  now: Date = new Date(),
): CommonCrawlDiscoveryCoverageRow[] {
  const structural = new Set(selectRegistryMassHarvestDomains(registry).map(normalizeDomain));
  const seeds = new Map(
    seedCoverage.map((row) => [normalizeDomain(row.source_domain), row] as const),
  );

  return policies
    .filter((policy) => (policy.allowed_discovery_channels ?? []).map((channel) => channel.toLowerCase()).includes("commoncrawl"))
    .map((policy) => {
      const domain = normalizeDomain(policy.source_domain);
      const harvestReady = structural.has(domain);
      const operational = policyIsOperational(policy, now);
      const coverage = seeds.get(domain);
      const state: CommonCrawlDiscoveryCoverageState = !operational
        ? "POLICY_EXPIRED_OR_BLOCKED"
        : harvestReady
          ? "HARVEST_READY"
          : "POLICY_ALLOWED_PATTERN_MISSING";

      return {
        source_domain: domain,
        state,
        policy_review_status: policy.review_status,
        policy_next_review_at: policy.next_review_at,
        structural_harvest_ready: harvestReady,
        seed_count: coverage?.seed_count ?? 0,
        latest_observed_at: coverage?.latest_observed_at ?? null,
      };
    })
    .sort((a, b) => {
      const order: Record<CommonCrawlDiscoveryCoverageState, number> = {
        POLICY_ALLOWED_PATTERN_MISSING: 0,
        HARVEST_READY: 1,
        POLICY_EXPIRED_OR_BLOCKED: 2,
      };
      return order[a.state] - order[b.state] || b.seed_count - a.seed_count || a.source_domain.localeCompare(b.source_domain);
    });
}

export function summarizeCommonCrawlDiscoveryCoverage(rows: CommonCrawlDiscoveryCoverageRow[]) {
  const byState = rows.reduce<Record<CommonCrawlDiscoveryCoverageState, number>>((acc, row) => {
    acc[row.state] += 1;
    return acc;
  }, {
    HARVEST_READY: 0,
    POLICY_ALLOWED_PATTERN_MISSING: 0,
    POLICY_EXPIRED_OR_BLOCKED: 0,
  });

  return {
    commoncrawl_policy_domains: rows.length,
    operational_policy_domains: rows.filter((row) => row.state !== "POLICY_EXPIRED_OR_BLOCKED").length,
    harvest_ready_domains: byState.HARVEST_READY,
    pattern_missing_domains: byState.POLICY_ALLOWED_PATTERN_MISSING,
    expired_or_blocked_domains: byState.POLICY_EXPIRED_OR_BLOCKED,
    harvest_ready_ratio: rows.filter((row) => row.state !== "POLICY_EXPIRED_OR_BLOCKED").length
      ? Number((byState.HARVEST_READY / rows.filter((row) => row.state !== "POLICY_EXPIRED_OR_BLOCKED").length).toFixed(4))
      : 0,
    commoncrawl_seed_rows_on_policy_domains: rows.reduce((sum, row) => sum + row.seed_count, 0),
  };
}
