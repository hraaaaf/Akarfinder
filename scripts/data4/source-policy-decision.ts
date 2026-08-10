export type PolicyDecisionKind = "permission_required" | "remain_unverified";

export type PolicyEvidenceSpec = {
  url: string;
  kind: "official_terms" | "official_legal_notice" | "official_site" | "official_robots";
  requiredPhrases: string[];
};

export type PolicyTarget = {
  authorization_status: "permission_required";
  terms_status: "permission_required";
  content_reuse_policy: "permission_required";
  detail_fetch_policy: "permission_required";
  partnership_required: true;
  legal_review_required: true;
  recommended_action: string;
  machine_gate: "internal_signal_only";
  ingestion_gate: "internal_signal_only";
  display_gate: "hidden";
  display_policy: "internal_signal_only";
};

export type PolicyDecision = {
  sourceDomain: string;
  decision: PolicyDecisionKind;
  registryMutationPlanned: boolean;
  nonBlocking?: boolean;
  evidence: PolicyEvidenceSpec[];
  rationale: string;
  target?: PolicyTarget;
};

export type PolicyDecisionDocument = {
  schemaVersion: string;
  lot: string;
  reviewDate: string;
  doctrine: {
    robotsOrSitemapIsNotPermission: boolean;
    absenceOfTermsIsNotPermission: boolean;
    noImplicitAuthorization: boolean;
    ingestionAuthorizedByThisLot: boolean;
    publicDisplayAuthorizedByThisLot: boolean;
  };
  sources: PolicyDecision[];
};

export type RegistryPolicyRow = {
  source_domain: string;
  source_name: string;
  current_representation_count: number;
  discovery_policy: string;
  detail_fetch_policy: string;
  content_reuse_policy: string;
  display_policy: string;
  robots_status: string;
  terms_status: string;
  partnership_required: boolean;
  legal_review_required: boolean;
  no_bypass_required: boolean;
  evidence_urls: string[];
  evidence_summary: string;
  recommended_action: string;
  reviewed_at: string;
  next_review_at: string;
  updated_at: string;
  policy_version: string;
  authorization_status: string;
  acquisition_mode: string;
  allowed_discovery_channels: string[];
  max_revalidation_interval_days: number;
  review_status: string;
  policy_effective_at: string | null;
  policy_expires_at: string | null;
  evidence_observed_at: string | null;
  robots_observed_at: string | null;
  terms_observed_at: string | null;
  contact_status: string;
  machine_gate: string;
  policy_hash: string | null;
  ingestion_gate: string;
  display_gate: string;
};

export type RegistryPolicyPatch = Pick<
  RegistryPolicyRow,
  | "authorization_status"
  | "terms_status"
  | "content_reuse_policy"
  | "detail_fetch_policy"
  | "partnership_required"
  | "legal_review_required"
  | "recommended_action"
  | "machine_gate"
  | "ingestion_gate"
  | "display_gate"
  | "display_policy"
  | "evidence_urls"
  | "evidence_summary"
  | "reviewed_at"
  | "next_review_at"
  | "updated_at"
  | "policy_effective_at"
  | "evidence_observed_at"
  | "terms_observed_at"
  | "review_status"
  | "policy_hash"
>;

export function isOfficialEvidenceUrl(sourceDomain: string, rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    const domain = sourceDomain.toLowerCase().replace(/\.$/, "");
    return url.protocol === "https:" && (host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function normalizePhrase(value: string): string {
  return value.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function evidenceContainsRequiredPhrases(body: string, phrases: string[]): boolean {
  const normalized = normalizePhrase(body);
  return phrases.every((phrase) => normalized.includes(normalizePhrase(phrase)));
}

export function validateDecisionDocument(doc: PolicyDecisionDocument): string[] {
  const errors: string[] = [];
  if (doc.schemaVersion !== "data-4-9c-source-policy-decisions-v1") errors.push("wrong_schema_version");
  if (doc.lot !== "DATA-4.9C") errors.push("wrong_lot");
  if (!doc.doctrine.robotsOrSitemapIsNotPermission) errors.push("robots_permission_boundary_missing");
  if (!doc.doctrine.absenceOfTermsIsNotPermission) errors.push("absence_terms_boundary_missing");
  if (!doc.doctrine.noImplicitAuthorization) errors.push("implicit_authorization_boundary_missing");
  if (doc.doctrine.ingestionAuthorizedByThisLot !== false) errors.push("ingestion_must_be_false");
  if (doc.doctrine.publicDisplayAuthorizedByThisLot !== false) errors.push("display_must_be_false");
  if (doc.sources.length !== 6) errors.push("wrong_source_count");
  if (new Set(doc.sources.map((row) => row.sourceDomain)).size !== doc.sources.length) errors.push("duplicate_source_domain");

  const planned = doc.sources.filter((row) => row.registryMutationPlanned);
  if (planned.length !== 1 || planned[0]?.sourceDomain !== "agadirimmobilier.ma") errors.push("unexpected_mutation_cohort");

  for (const source of doc.sources) {
    if (source.evidence.length === 0) errors.push(`missing_evidence:${source.sourceDomain}`);
    for (const evidence of source.evidence) {
      if (!isOfficialEvidenceUrl(source.sourceDomain, evidence.url)) errors.push(`off_origin_evidence:${source.sourceDomain}:${evidence.url}`);
    }
    if (source.registryMutationPlanned) {
      if (source.decision !== "permission_required") errors.push(`mutation_not_permission_required:${source.sourceDomain}`);
      if (!source.target) errors.push(`missing_target:${source.sourceDomain}`);
      if (!source.evidence.some((row) => row.kind === "official_terms" && row.requiredPhrases.length > 0)) {
        errors.push(`mutation_missing_explicit_terms_evidence:${source.sourceDomain}`);
      }
      if (source.target) {
        if (source.target.authorization_status !== "permission_required") errors.push(`target_authorization_not_restrictive:${source.sourceDomain}`);
        if (source.target.content_reuse_policy !== "permission_required") errors.push(`target_reuse_not_restrictive:${source.sourceDomain}`);
        if (source.target.detail_fetch_policy !== "permission_required") errors.push(`target_detail_not_restrictive:${source.sourceDomain}`);
        if (source.target.ingestion_gate !== "internal_signal_only") errors.push(`target_ingestion_gate_not_internal:${source.sourceDomain}`);
        if (source.target.display_gate !== "hidden") errors.push(`target_display_not_hidden:${source.sourceDomain}`);
        if (source.target.display_policy !== "internal_signal_only") errors.push(`target_display_policy_not_internal:${source.sourceDomain}`);
      }
    } else {
      if (source.decision !== "remain_unverified") errors.push(`nonmutation_decision_not_unverified:${source.sourceDomain}`);
      if (source.target) errors.push(`unverified_source_has_target:${source.sourceDomain}`);
    }
  }

  return errors;
}

export function registryRowMatchesSafePrecondition(row: RegistryPolicyRow): boolean {
  return row.authorization_status === "unverified"
    && row.display_gate === "hidden"
    && row.display_policy === "internal_signal_only"
    && row.ingestion_gate === "internal_signal_only"
    && row.machine_gate === "internal_signal_only"
    && row.current_representation_count === 0
    && row.no_bypass_required === true;
}

export function buildRestrictivePatch(
  before: RegistryPolicyRow,
  decision: PolicyDecision,
  observedAt: string,
  policyHash: string,
): RegistryPolicyPatch | null {
  if (!decision.registryMutationPlanned || !decision.target) return null;
  if (!registryRowMatchesSafePrecondition(before)) throw new Error(`registry_precondition_failed:${before.source_domain}`);
  if (decision.sourceDomain !== before.source_domain) throw new Error(`source_domain_mismatch:${decision.sourceDomain}`);

  const nextReview = new Date(observedAt);
  nextReview.setUTCDate(nextReview.getUTCDate() + Math.max(1, Math.min(90, before.max_revalidation_interval_days)));
  const evidenceUrls = [...new Set([...before.evidence_urls, ...decision.evidence.map((row) => row.url)])].sort();

  return {
    ...decision.target,
    evidence_urls: evidenceUrls,
    evidence_summary: `DATA-4.9C: ${decision.rationale}`,
    reviewed_at: observedAt,
    next_review_at: nextReview.toISOString(),
    updated_at: observedAt,
    policy_effective_at: observedAt,
    evidence_observed_at: observedAt,
    terms_observed_at: observedAt,
    review_status: "current",
    policy_hash: policyHash,
  };
}

export function patchIsNonActivating(patch: RegistryPolicyPatch): boolean {
  return patch.authorization_status === "permission_required"
    && patch.content_reuse_policy === "permission_required"
    && patch.detail_fetch_policy === "permission_required"
    && patch.machine_gate === "internal_signal_only"
    && patch.ingestion_gate === "internal_signal_only"
    && patch.display_gate === "hidden"
    && patch.display_policy === "internal_signal_only";
}
