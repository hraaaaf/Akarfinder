export type DarAgadirShadowClass =
  | "ELIGIBLE_SHADOW"
  | "SEED_ONLY_REVALIDATION_REQUIRED"
  | "INSUFFICIENT_STRUCTURE"
  | "INSUFFICIENT_QUALITY_EVIDENCE"
  | "NON_NORMALIZED"
  | "DUPLICATE"
  | "POLICY_BLOCKED";

export interface DarAgadirPolicy {
  sourceDomain: string;
  acquisitionMode: string | null;
  discoveryPolicy: string | null;
  detailFetchPolicy: string | null;
  contentReusePolicy: string | null;
  displayPolicy: string | null;
  displayGate: string | null;
  machineGate: string | null;
  allowedDiscoveryChannels: string[];
  maxRevalidationIntervalDays: number | null;
  reviewStatus: string | null;
}

export interface DarAgadirCandidate {
  canonicalUrl: string;
  normalizationStatus: string;
  freshnessStatus: string;
  city: string | null;
  propertyType: string | null;
  intent: string | null;
  qualityScore: number | null;
  displayEligibility: string | null;
}

export interface DarAgadirShadowResult extends DarAgadirCandidate {
  classification: DarAgadirShadowClass;
  reasons: string[];
  productionActivable: false;
}

export function policyAllowsCanonicalShadow(policy: DarAgadirPolicy): boolean {
  return policy.sourceDomain === "daragadir.com"
    && policy.acquisitionMode === "public_sitemap_canonical_link"
    && policy.discoveryPolicy === "public_sitemap_only"
    && policy.displayPolicy === "canonical_link_only"
    && policy.displayGate === "external_tail_link_only"
    && policy.machineGate === "canonical_link_only"
    && policy.allowedDiscoveryChannels.includes("public_sitemap")
    && policy.detailFetchPolicy === "legal_review_required";
}

function isCanonicalHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "daragadir.com" || url.hostname === "www.daragadir.com");
  } catch {
    return false;
  }
}

export function classifyDarAgadirCandidate(
  row: DarAgadirCandidate,
  policy: DarAgadirPolicy,
  duplicate = false,
): DarAgadirShadowResult {
  const reasons: string[] = [];

  if (!policyAllowsCanonicalShadow(policy)) {
    return { ...row, classification: "POLICY_BLOCKED", reasons: ["registry_boundary_mismatch"], productionActivable: false };
  }

  if (duplicate) {
    return { ...row, classification: "DUPLICATE", reasons: ["duplicate_canonical_url"], productionActivable: false };
  }

  if (!isCanonicalHttpsUrl(row.canonicalUrl)) {
    return { ...row, classification: "INSUFFICIENT_STRUCTURE", reasons: ["invalid_or_external_canonical_url"], productionActivable: false };
  }

  if (row.normalizationStatus !== "normalized") {
    return { ...row, classification: "NON_NORMALIZED", reasons: ["normalization_not_complete"], productionActivable: false };
  }

  if (row.freshnessStatus !== "fresh_confirmed") {
    return {
      ...row,
      classification: "SEED_ONLY_REVALIDATION_REQUIRED",
      reasons: ["freshness_not_confirmed"],
      productionActivable: false,
    };
  }

  if (!row.city || !row.propertyType || !row.intent) {
    return {
      ...row,
      classification: "INSUFFICIENT_STRUCTURE",
      reasons: [
        !row.city ? "missing_city" : "",
        !row.propertyType ? "missing_property_type" : "",
        !row.intent ? "missing_intent" : "",
      ].filter(Boolean),
      productionActivable: false,
    };
  }

  if (row.qualityScore === null || row.qualityScore < 40 || !row.displayEligibility) {
    reasons.push(row.qualityScore === null ? "missing_quality_score" : "quality_below_40");
    if (!row.displayEligibility) reasons.push("missing_display_evidence");
    return { ...row, classification: "INSUFFICIENT_QUALITY_EVIDENCE", reasons, productionActivable: false };
  }

  return {
    ...row,
    classification: "ELIGIBLE_SHADOW",
    reasons: ["fresh_core_structured_quality_confirmed"],
    productionActivable: false,
  };
}

export function classifyDarAgadirRows(
  rows: DarAgadirCandidate[],
  policy: DarAgadirPolicy,
): DarAgadirShadowResult[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const duplicate = seen.has(row.canonicalUrl);
    seen.add(row.canonicalUrl);
    return classifyDarAgadirCandidate(row, policy, duplicate);
  });
}
