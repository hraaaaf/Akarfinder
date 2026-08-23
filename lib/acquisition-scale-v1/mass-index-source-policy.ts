// P0.1 — Mass Index Source Registry Operational Gate
// Pure policy evaluation for discovery/storage admission. The production
// source_policy_registry remains the authority; structural URL-pattern
// registries may narrow candidates but can never authorize a channel.

export const MASS_INDEX_COMMONCRAWL_CHANNEL = "commoncrawl" as const;

export type MassIndexSourcePolicy = {
  source_domain: string;
  allowed_discovery_channels: string[] | null;
  review_status: string | null;
  next_review_at: string | null;
  no_bypass_required: boolean | null;
  policy_hash: string | null;
  acquisition_mode: string | null;
  machine_gate: string | null;
  ingestion_gate: string | null;
  display_gate: string | null;
};

export type MassIndexPolicyDecisionReason =
  | "allowed"
  | "source_unregistered"
  | "invalid_source_domain"
  | "invalid_no_bypass"
  | "missing_policy_hash"
  | "policy_review_not_current"
  | "channel_not_allowed"
  | "acquisition_blocked"
  | "machine_gate_blocked"
  | "ingestion_gate_blocked";

export type MassIndexPolicyDecision = {
  allowed: boolean;
  reason: MassIndexPolicyDecisionReason;
  source_domain: string;
  discovery_channel: string;
  policy_hash: string | null;
};

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase();
}

function policyReviewIsCurrent(policy: MassIndexSourcePolicy, now: Date): boolean {
  if (!(["current", "due_soon"] as const).includes(policy.review_status as "current" | "due_soon")) {
    return false;
  }
  if (!policy.next_review_at) return false;
  const nextReviewAt = new Date(policy.next_review_at);
  return Number.isFinite(nextReviewAt.getTime()) && nextReviewAt.getTime() > now.getTime();
}

function evaluateMassIndexPolicyPrerequisites(
  sourceDomain: string,
  discoveryChannel: string,
  policy: MassIndexSourcePolicy | null | undefined,
  now: Date,
): MassIndexPolicyDecision | null {
  const domain = normalizeDomain(sourceDomain || "");
  const channel = discoveryChannel.trim().toLowerCase();
  const base = {
    source_domain: domain,
    discovery_channel: channel,
    policy_hash: policy?.policy_hash ?? null,
  };

  if (!domain || !channel) return { ...base, allowed: false, reason: "invalid_source_domain" };
  if (!policy || normalizeDomain(policy.source_domain || "") !== domain) {
    return { ...base, allowed: false, reason: "source_unregistered" };
  }
  if (policy.no_bypass_required !== true) {
    return { ...base, allowed: false, reason: "invalid_no_bypass" };
  }
  if (!policy.policy_hash?.trim()) {
    return { ...base, allowed: false, reason: "missing_policy_hash" };
  }
  if (!(policy.allowed_discovery_channels ?? []).map((item) => item.toLowerCase()).includes(channel)) {
    return { ...base, allowed: false, reason: "channel_not_allowed" };
  }
  if (!policyReviewIsCurrent(policy, now)) {
    return { ...base, allowed: false, reason: "policy_review_not_current" };
  }
  if (!policy.machine_gate || policy.machine_gate.startsWith("blocked")) {
    return { ...base, allowed: false, reason: "machine_gate_blocked" };
  }

  return null;
}

export function evaluateMassIndexSourcePolicy(
  sourceDomain: string,
  discoveryChannel: string,
  policy: MassIndexSourcePolicy | null | undefined,
  now: Date = new Date(),
): MassIndexPolicyDecision {
  const prerequisiteDecision = evaluateMassIndexPolicyPrerequisites(
    sourceDomain,
    discoveryChannel,
    policy,
    now,
  );
  if (prerequisiteDecision) return prerequisiteDecision;

  const base = {
    source_domain: normalizeDomain(sourceDomain),
    discovery_channel: discoveryChannel.trim().toLowerCase(),
    policy_hash: policy?.policy_hash ?? null,
  };

  if (policy!.acquisition_mode === "blocked") {
    return { ...base, allowed: false, reason: "acquisition_blocked" };
  }
  if (!policy!.ingestion_gate || policy!.ingestion_gate.startsWith("blocked")) {
    return { ...base, allowed: false, reason: "ingestion_gate_blocked" };
  }

  return { ...base, allowed: true, reason: "allowed" };
}

/**
 * Minimal external-index policy plane for URL metadata such as Common Crawl CDX.
 *
 * This deliberately preserves the canonical registry, current-review,
 * explicit-channel, no-bypass and machine gates while NOT interpreting source
 * acquisition or ingestion/reuse gates as permission to query an external URL
 * index. Content/network/reuse permissions remain a separate M3 access plane.
 */
export function evaluateMassIndexExternalIndexPolicy(
  sourceDomain: string,
  discoveryChannel: string,
  policy: MassIndexSourcePolicy | null | undefined,
  now: Date = new Date(),
): MassIndexPolicyDecision {
  const prerequisiteDecision = evaluateMassIndexPolicyPrerequisites(
    sourceDomain,
    discoveryChannel,
    policy,
    now,
  );
  if (prerequisiteDecision) return prerequisiteDecision;

  return {
    source_domain: normalizeDomain(sourceDomain),
    discovery_channel: discoveryChannel.trim().toLowerCase(),
    policy_hash: policy?.policy_hash ?? null,
    allowed: true,
    reason: "allowed",
  };
}

function evaluateMassIndexDomainSet(
  sourceDomains: string[],
  discoveryChannel: string,
  policies: MassIndexSourcePolicy[],
  evaluator: (
    sourceDomain: string,
    discoveryChannel: string,
    policy: MassIndexSourcePolicy | null | undefined,
    now: Date,
  ) => MassIndexPolicyDecision,
  now: Date,
): { allowedDomains: string[]; decisions: MassIndexPolicyDecision[] } {
  const policyByDomain = new Map(
    policies.map((policy) => [normalizeDomain(policy.source_domain), policy] as const),
  );
  const domains = [...new Set(sourceDomains.map(normalizeDomain).filter(Boolean))].sort();
  const decisions = domains.map((domain) =>
    evaluator(domain, discoveryChannel, policyByDomain.get(domain), now),
  );

  return {
    allowedDomains: decisions.filter((decision) => decision.allowed).map((decision) => decision.source_domain),
    decisions,
  };
}

export function evaluateMassIndexDomains(
  sourceDomains: string[],
  discoveryChannel: string,
  policies: MassIndexSourcePolicy[],
  now: Date = new Date(),
): { allowedDomains: string[]; decisions: MassIndexPolicyDecision[] } {
  return evaluateMassIndexDomainSet(
    sourceDomains,
    discoveryChannel,
    policies,
    evaluateMassIndexSourcePolicy,
    now,
  );
}

export function evaluateMassIndexExternalIndexDomains(
  sourceDomains: string[],
  discoveryChannel: string,
  policies: MassIndexSourcePolicy[],
  now: Date = new Date(),
): { allowedDomains: string[]; decisions: MassIndexPolicyDecision[] } {
  return evaluateMassIndexDomainSet(
    sourceDomains,
    discoveryChannel,
    policies,
    evaluateMassIndexExternalIndexPolicy,
    now,
  );
}
