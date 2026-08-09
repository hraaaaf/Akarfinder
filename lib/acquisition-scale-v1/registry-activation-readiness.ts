// P0.5 — Registry Activation Readiness Gate
// Pure decision contract. P0.4 shadow evidence can nominate a candidate, but
// production Source Registry policy remains authoritative for any later canary.

import {
  MASS_INDEX_COMMONCRAWL_CHANNEL,
  evaluateMassIndexSourcePolicy,
  type MassIndexPolicyDecision,
  type MassIndexSourcePolicy,
} from "@/lib/acquisition-scale-v1/mass-index-source-policy";

export const P0_5_TARGET_DOMAINS = [
  "christiesrealestatemorocco.com",
  "immobilier-a-marrakech.com",
] as const;

export type P0_5TargetDomain = (typeof P0_5_TARGET_DOMAINS)[number];

export type RegistryActivationPolicy = MassIndexSourcePolicy & {
  authorization_status: string | null;
  partnership_required: boolean | null;
  legal_review_required: boolean | null;
  discovery_policy: string | null;
  detail_fetch_policy: string | null;
  content_reuse_policy: string | null;
  display_policy: string | null;
};

export type RegistryActivationReadinessReason =
  | "ready_for_canary_review"
  | "shadow_not_acceptable"
  | "commoncrawl_policy_blocked"
  | "authorization_not_positive"
  | "partnership_required"
  | "legal_review_required";

export type RegistryActivationReadinessDecision = {
  source_domain: string;
  canary_scope: "commoncrawl_seed_only_internal";
  ready: boolean;
  decision: "READY_FOR_CANARY_REVIEW" | "BLOCKED_BY_POLICY";
  reasons: RegistryActivationReadinessReason[];
  commoncrawl_policy: MassIndexPolicyDecision;
  authorization_status: string | null;
  partnership_required: boolean | null;
  legal_review_required: boolean | null;
  discovery_policy: string | null;
  detail_fetch_policy: string | null;
  content_reuse_policy: string | null;
  display_policy: string | null;
  policy_hash: string | null;
};

const POSITIVE_AUTHORIZATION = new Set(["limited_public_facts", "authorized_partner"]);

export function evaluateRegistryActivationReadiness(
  sourceDomain: string,
  policy: RegistryActivationPolicy | null | undefined,
  shadowAcceptable: boolean,
  now: Date = new Date(),
): RegistryActivationReadinessDecision {
  const commoncrawlPolicy = evaluateMassIndexSourcePolicy(
    sourceDomain,
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    policy,
    now,
  );
  const reasons: RegistryActivationReadinessReason[] = [];

  if (!shadowAcceptable) reasons.push("shadow_not_acceptable");
  if (!commoncrawlPolicy.allowed) reasons.push("commoncrawl_policy_blocked");
  if (!policy || !POSITIVE_AUTHORIZATION.has(policy.authorization_status ?? "")) {
    reasons.push("authorization_not_positive");
  }
  if (policy?.partnership_required === true) reasons.push("partnership_required");
  if (policy?.legal_review_required === true) reasons.push("legal_review_required");

  const ready = reasons.length === 0;
  return {
    source_domain: sourceDomain.trim().toLowerCase(),
    canary_scope: "commoncrawl_seed_only_internal",
    ready,
    decision: ready ? "READY_FOR_CANARY_REVIEW" : "BLOCKED_BY_POLICY",
    reasons,
    commoncrawl_policy: commoncrawlPolicy,
    authorization_status: policy?.authorization_status ?? null,
    partnership_required: policy?.partnership_required ?? null,
    legal_review_required: policy?.legal_review_required ?? null,
    discovery_policy: policy?.discovery_policy ?? null,
    detail_fetch_policy: policy?.detail_fetch_policy ?? null,
    content_reuse_policy: policy?.content_reuse_policy ?? null,
    display_policy: policy?.display_policy ?? null,
    policy_hash: policy?.policy_hash ?? null,
  };
}
