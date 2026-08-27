// Fail-closed Source Policy Registry preflight for SEED-LISTING-MASS-CONVERSION-V1.
// The Yandex/SearXNG confirmation lane is treated as public-index discovery:
// it observes search-engine representations only and never fetches source detail pages.

export const SEED_CONFIRMATION_DISCOVERY_CHANNEL = "public_index";

export type SeedConfirmationPolicy = {
  source_domain: string;
  authorization_status: string | null;
  acquisition_mode: string | null;
  allowed_discovery_channels: string[] | null;
  review_status: string | null;
  policy_effective_at: string | null;
  policy_expires_at: string | null;
  machine_gate: string | null;
  ingestion_gate: string | null;
  display_gate: string | null;
};

export type SeedPolicyDecision =
  | { eligible: true; reason: "policy_current_public_index_link_only" }
  | {
      eligible: false;
      reason:
        | "missing_policy"
        | "authorization_not_eligible"
        | "acquisition_mode_not_eligible"
        | "discovery_channel_not_allowed"
        | "review_status_not_current"
        | "policy_not_effective"
        | "policy_expired"
        | "machine_gate_not_link_only"
        | "ingestion_gate_not_link_only"
        | "display_gate_not_external_tail";
    };

export function normalizePolicyDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

export function evaluateSeedConfirmationPolicy(
  policy: SeedConfirmationPolicy | null | undefined,
  now: Date = new Date(),
): SeedPolicyDecision {
  if (!policy) return { eligible: false, reason: "missing_policy" };

  // Current registry doctrine: this lane is only allowed for explicit
  // canonical-link-only policies. Permission-required/prohibited rows never
  // reach the network. Unknown/future authorization states fail closed too.
  if (policy.authorization_status !== "unverified") {
    return { eligible: false, reason: "authorization_not_eligible" };
  }
  if (policy.acquisition_mode !== "public_index_internal_only") {
    return { eligible: false, reason: "acquisition_mode_not_eligible" };
  }
  if (!(policy.allowed_discovery_channels ?? []).includes(SEED_CONFIRMATION_DISCOVERY_CHANNEL)) {
    return { eligible: false, reason: "discovery_channel_not_allowed" };
  }
  if (policy.review_status !== "current" && policy.review_status !== "due_soon") {
    return { eligible: false, reason: "review_status_not_current" };
  }
  if (!policy.policy_effective_at || new Date(policy.policy_effective_at).getTime() > now.getTime()) {
    return { eligible: false, reason: "policy_not_effective" };
  }
  if (!policy.policy_expires_at || new Date(policy.policy_expires_at).getTime() <= now.getTime()) {
    return { eligible: false, reason: "policy_expired" };
  }
  if (policy.machine_gate !== "canonical_link_only") {
    return { eligible: false, reason: "machine_gate_not_link_only" };
  }
  if (policy.ingestion_gate !== "canonical_link_only") {
    return { eligible: false, reason: "ingestion_gate_not_link_only" };
  }
  if (policy.display_gate !== "external_tail_link_only") {
    return { eligible: false, reason: "display_gate_not_external_tail" };
  }
  return { eligible: true, reason: "policy_current_public_index_link_only" };
}

export function buildSeedConfirmationPolicyMap(
  policies: SeedConfirmationPolicy[],
): Map<string, SeedConfirmationPolicy> {
  const out = new Map<string, SeedConfirmationPolicy>();
  for (const policy of policies) out.set(normalizePolicyDomain(policy.source_domain), policy);
  return out;
}
