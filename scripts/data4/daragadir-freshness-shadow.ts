export type FreshnessShadowClass =
  | "SHADOW_READY"
  | "SITEMAP_PRESENT_BUT_INSUFFICIENT_STRUCTURE"
  | "SITEMAP_PRESENT_BUT_INSUFFICIENT_QUALITY"
  | "SITEMAP_PRESENT_NON_NORMALIZED"
  | "NOT_PRESENT_IN_CURRENT_SITEMAP"
  | "DUPLICATE"
  | "POLICY_BLOCKED";

export interface FreshnessShadowPolicy {
  sourceDomain: string;
  acquisitionMode: string | null;
  discoveryPolicy: string | null;
  displayPolicy: string | null;
  displayGate: string | null;
  machineGate: string | null;
  allowedDiscoveryChannels: string[];
  maxRevalidationIntervalDays: number | null;
  reviewStatus: string | null;
}

export interface FreshnessShadowCandidate {
  canonicalUrl: string;
  normalizationStatus: string;
  freshnessStatus: string;
  city: string | null;
  propertyType: string | null;
  intent: string | null;
  qualityScore: number | null;
  displayEligibility: string | null;
}

export interface FreshnessShadowResult extends FreshnessShadowCandidate {
  sitemapPresent: boolean;
  classification: FreshnessShadowClass;
  hypotheticalFreshnessSignal: "sitemap_present_shadow" | null;
  productionActivable: false;
}

export function policyAllowsFreshnessShadow(policy: FreshnessShadowPolicy): boolean {
  return policy.sourceDomain === "daragadir.com"
    && policy.acquisitionMode === "public_sitemap_canonical_link"
    && policy.discoveryPolicy === "public_sitemap_only"
    && policy.displayPolicy === "canonical_link_only"
    && policy.displayGate === "external_tail_link_only"
    && policy.machineGate === "canonical_link_only"
    && policy.allowedDiscoveryChannels.includes("public_sitemap")
    && policy.maxRevalidationIntervalDays === 14
    && ["current", "due_soon"].includes(policy.reviewStatus ?? "");
}

function validDarAgadirUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["daragadir.com", "www.daragadir.com"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function classifyFreshnessShadowCandidate(
  row: FreshnessShadowCandidate,
  policy: FreshnessShadowPolicy,
  sitemapPresent: boolean,
  duplicate = false,
): FreshnessShadowResult {
  if (!policyAllowsFreshnessShadow(policy)) {
    return { ...row, sitemapPresent, classification: "POLICY_BLOCKED", hypotheticalFreshnessSignal: null, productionActivable: false };
  }
  if (duplicate) {
    return { ...row, sitemapPresent, classification: "DUPLICATE", hypotheticalFreshnessSignal: null, productionActivable: false };
  }
  if (!sitemapPresent || !validDarAgadirUrl(row.canonicalUrl)) {
    return { ...row, sitemapPresent, classification: "NOT_PRESENT_IN_CURRENT_SITEMAP", hypotheticalFreshnessSignal: null, productionActivable: false };
  }
  const hypotheticalFreshnessSignal = "sitemap_present_shadow" as const;
  if (row.normalizationStatus !== "normalized") {
    return { ...row, sitemapPresent, classification: "SITEMAP_PRESENT_NON_NORMALIZED", hypotheticalFreshnessSignal, productionActivable: false };
  }
  if (!row.city || !row.propertyType || !row.intent) {
    return { ...row, sitemapPresent, classification: "SITEMAP_PRESENT_BUT_INSUFFICIENT_STRUCTURE", hypotheticalFreshnessSignal, productionActivable: false };
  }
  if (row.qualityScore === null || row.qualityScore < 40 || !row.displayEligibility) {
    return { ...row, sitemapPresent, classification: "SITEMAP_PRESENT_BUT_INSUFFICIENT_QUALITY", hypotheticalFreshnessSignal, productionActivable: false };
  }
  return { ...row, sitemapPresent, classification: "SHADOW_READY", hypotheticalFreshnessSignal, productionActivable: false };
}

export function classifyFreshnessShadowRows(
  rows: FreshnessShadowCandidate[],
  policy: FreshnessShadowPolicy,
  sitemapUrls: Set<string>,
): FreshnessShadowResult[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const duplicate = seen.has(row.canonicalUrl);
    seen.add(row.canonicalUrl);
    return classifyFreshnessShadowCandidate(row, policy, sitemapUrls.has(row.canonicalUrl), duplicate);
  });
}
