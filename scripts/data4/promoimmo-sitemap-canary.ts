export const PROMOIMMO_DOMAIN = "promoimmomarrakech.com" as const;
export const PROMOIMMO_CANARY_SIZE = 50;
export const PROMOIMMO_TTL_DAYS = 14;
export const PROMOIMMO_CHANNEL = "public_sitemap_presence" as const;
export const PROMOIMMO_RUN_ID = "data-4-4b-promoimmo-canary-50-v1" as const;

export type PromoImmoRegistryPolicy = {
  sourceDomain: string;
  acquisitionMode: string | null;
  discoveryPolicy: string | null;
  displayPolicy: string | null;
  displayGate: string | null;
  machineGate: string | null;
  allowedDiscoveryChannels: string[];
  robotsStatus: string | null;
  maxRevalidationIntervalDays: number | null;
  reviewStatus: string | null;
};

export type PromoImmoCandidate = {
  canonicalUrl: string;
  freshnessStatus: string;
  normalizationStatus: string;
  city: string | null;
  propertyType: string | null;
  intent: string | null;
  qualityTier: string | null;
  qualityScore: number | null;
  displayEligibility: string | null;
  publicSearchPresent: boolean;
  technicalDisplayPresent: boolean;
  exactCrossSourceCollision: boolean;
};

export type SeedSnapshot = {
  canonicalUrl: string;
  freshnessStatus: string;
  freshLastSeenAt: string | null;
  freshChannels: string[];
  metadata: Record<string, unknown> | null;
  updatedAt: string | null;
};

export type SitemapEvidence = {
  canonicalUrl: string;
  sitemapUrl: string;
  observedAt: string;
};

export function registryAllowsPromoImmoCanary(policy: PromoImmoRegistryPolicy): boolean {
  return policy.sourceDomain === PROMOIMMO_DOMAIN
    && policy.acquisitionMode === "public_sitemap_canonical_link"
    && policy.discoveryPolicy === "public_sitemap_only"
    && policy.displayPolicy === "canonical_link_only"
    && policy.displayGate === "external_tail_link_only"
    && policy.machineGate === "canonical_link_only"
    && policy.allowedDiscoveryChannels.includes("public_sitemap")
    && policy.robotsStatus === "sitemap_declared"
    && policy.maxRevalidationIntervalDays === PROMOIMMO_TTL_DAYS
    && ["current", "due_soon"].includes(policy.reviewStatus ?? "");
}

export function samePromoImmoOrigin(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "https:"
      && [PROMOIMMO_DOMAIN, `www.${PROMOIMMO_DOMAIN}`].includes(url.hostname as typeof PROMOIMMO_DOMAIN);
  } catch {
    return false;
  }
}

export function extractPromoImmoRobotsSitemaps(text: string): string[] {
  const values = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*Sitemap\s*:\s*(\S+)\s*$/i);
    if (match?.[1] && samePromoImmoOrigin(match[1])) values.add(match[1]);
  }
  return [...values].sort();
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export function parsePromoImmoSitemapXml(xml: string): { kind: "index" | "urlset" | "unknown"; locs: string[] } {
  const kind = /<sitemapindex\b/i.test(xml) ? "index" : /<urlset\b/i.test(xml) ? "urlset" : "unknown";
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => decodeXml(match[1] ?? "").trim())
    .filter(samePromoImmoOrigin);
  return { kind, locs: [...new Set(locs)].sort() };
}

export function isConservativePromoImmoCanaryCandidate(candidate: PromoImmoCandidate): boolean {
  return candidate.freshnessStatus === "seed_only"
    && candidate.normalizationStatus === "normalized"
    && candidate.city === "Marrakech"
    && Boolean(candidate.propertyType?.trim())
    && Boolean(candidate.intent?.trim())
    && ["A", "B"].includes(candidate.qualityTier ?? "")
    && candidate.qualityScore !== null
    && candidate.publicSearchPresent
    && candidate.technicalDisplayPresent
    && candidate.displayEligibility !== null
    && candidate.displayEligibility.startsWith("eligible_")
    && !candidate.exactCrossSourceCollision;
}

export function selectPromoImmoCanary(candidates: PromoImmoCandidate[], size = PROMOIMMO_CANARY_SIZE): PromoImmoCandidate[] {
  if (!Number.isInteger(size) || size <= 0 || size > PROMOIMMO_CANARY_SIZE) {
    throw new Error(`Invalid DATA-4.4B canary size: ${size}`);
  }
  return candidates
    .filter(isConservativePromoImmoCanaryCandidate)
    .sort((a, b) => b.qualityScore! - a.qualityScore! || a.canonicalUrl.localeCompare(b.canonicalUrl))
    .slice(0, size);
}

function addSitemapEvidence(metadata: Record<string, unknown> | null, evidence: SitemapEvidence, before: SeedSnapshot): Record<string, unknown> {
  const base = metadata ? structuredClone(metadata) : {};
  const freshnessEvidence = typeof base.freshness_evidence === "object" && base.freshness_evidence !== null
    ? { ...(base.freshness_evidence as Record<string, unknown>) }
    : {};
  freshnessEvidence.sitemap_presence = {
    observed_at: evidence.observedAt,
    sitemap_url: evidence.sitemapUrl,
    channel: PROMOIMMO_CHANNEL,
    ttl_days: PROMOIMMO_TTL_DAYS,
  };
  freshnessEvidence.controlled_canary_batch = {
    run_id: PROMOIMMO_RUN_ID,
    channel: PROMOIMMO_CHANNEL,
    ttl_days: PROMOIMMO_TTL_DAYS,
    observed_at: evidence.observedAt,
    rollback_snapshot: {
      freshness_status: before.freshnessStatus,
      fresh_last_seen_at: before.freshLastSeenAt,
      fresh_channels: [...before.freshChannels],
      metadata: before.metadata ? structuredClone(before.metadata) : null,
      updated_at_audit_only: before.updatedAt,
    },
  };
  return { ...base, freshness_evidence: freshnessEvidence };
}

export function buildPromoImmoCanaryPlan(before: SeedSnapshot, evidence: SitemapEvidence) {
  if (before.canonicalUrl !== evidence.canonicalUrl) throw new Error("Canonical URL mismatch");
  if (before.freshnessStatus !== "seed_only") throw new Error(`Canary must begin seed_only: ${before.canonicalUrl}`);
  if (before.freshChannels.includes(PROMOIMMO_CHANNEL)) throw new Error(`Canary channel already present: ${before.canonicalUrl}`);
  if (!samePromoImmoOrigin(before.canonicalUrl) || !samePromoImmoOrigin(evidence.sitemapUrl)) throw new Error("Promo Immo origin mismatch");
  if (!Number.isFinite(new Date(evidence.observedAt).getTime())) throw new Error("Invalid observedAt");

  return {
    canonicalUrl: before.canonicalUrl,
    before: structuredClone(before),
    proposed: {
      freshnessStatus: "fresh_confirmed" as const,
      freshLastSeenAt: evidence.observedAt,
      freshChannels: [...new Set([...before.freshChannels, PROMOIMMO_CHANNEL])].sort(),
      metadata: addSitemapEvidence(before.metadata, evidence, before),
    },
    rollback: {
      freshnessStatus: before.freshnessStatus,
      freshLastSeenAt: before.freshLastSeenAt,
      freshChannels: [...before.freshChannels],
      metadata: before.metadata ? structuredClone(before.metadata) : null,
      updatedAtAuditOnly: before.updatedAt,
    },
  };
}
