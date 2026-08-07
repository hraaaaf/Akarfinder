export const SITEMAP_FRESHNESS_CHANNEL = "public_sitemap_presence" as const;
export const SITEMAP_FRESHNESS_TTL_DAYS = 14;
export const DEFAULT_CANARY_SIZE = 100;

export interface CanarySeedState {
  canonicalUrl: string;
  freshnessStatus: string;
  freshLastSeenAt: string | null;
  freshChannels: string[];
  metadata: Record<string, unknown> | null;
}

export interface SitemapPresenceEvidence {
  canonicalUrl: string;
  observedAt: string;
  sitemapUrl: string;
}

export interface ProposedFreshnessCanaryUpdate {
  canonicalUrl: string;
  before: CanarySeedState;
  proposed: {
    freshnessStatus: "fresh_confirmed";
    freshLastSeenAt: string;
    freshChannels: string[];
    metadata: Record<string, unknown>;
  };
  rollback: {
    freshnessStatus: string;
    freshLastSeenAt: string | null;
    freshChannels: string[];
    metadata: Record<string, unknown> | null;
  };
}

function mergeChannel(channels: string[]): string[] {
  return [...new Set([...channels, SITEMAP_FRESHNESS_CHANNEL])].sort();
}

function withEvidenceMetadata(
  metadata: Record<string, unknown> | null,
  evidence: SitemapPresenceEvidence,
): Record<string, unknown> {
  const base = metadata ? structuredClone(metadata) : {};
  const existingEvidence = typeof base.freshness_evidence === "object" && base.freshness_evidence !== null
    ? { ...(base.freshness_evidence as Record<string, unknown>) }
    : {};
  existingEvidence.sitemap_presence = {
    observed_at: evidence.observedAt,
    sitemap_url: evidence.sitemapUrl,
    channel: SITEMAP_FRESHNESS_CHANNEL,
    ttl_days: SITEMAP_FRESHNESS_TTL_DAYS,
  };
  return { ...base, freshness_evidence: existingEvidence };
}

export function buildProposedSitemapFreshnessUpdate(
  before: CanarySeedState,
  evidence: SitemapPresenceEvidence,
): ProposedFreshnessCanaryUpdate {
  if (before.canonicalUrl !== evidence.canonicalUrl) {
    throw new Error(`Canonical URL mismatch: ${before.canonicalUrl} != ${evidence.canonicalUrl}`);
  }
  const observedAt = new Date(evidence.observedAt);
  if (!Number.isFinite(observedAt.getTime())) throw new Error(`Invalid observedAt: ${evidence.observedAt}`);
  if (!/^https:\/\/[^/]+\//.test(evidence.sitemapUrl)) throw new Error(`Invalid sitemap URL: ${evidence.sitemapUrl}`);

  return {
    canonicalUrl: before.canonicalUrl,
    before: structuredClone(before),
    proposed: {
      freshnessStatus: "fresh_confirmed",
      freshLastSeenAt: evidence.observedAt,
      freshChannels: mergeChannel(before.freshChannels),
      metadata: withEvidenceMetadata(before.metadata, evidence),
    },
    rollback: {
      freshnessStatus: before.freshnessStatus,
      freshLastSeenAt: before.freshLastSeenAt,
      freshChannels: [...before.freshChannels],
      metadata: before.metadata ? structuredClone(before.metadata) : null,
    },
  };
}

export function selectDeterministicCanary<T extends { canonicalUrl: string }>(
  rows: T[],
  size = DEFAULT_CANARY_SIZE,
): T[] {
  if (!Number.isInteger(size) || size <= 0) throw new Error(`Invalid canary size: ${size}`);
  return [...rows]
    .sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl))
    .slice(0, size);
}

export function canaryExpiresAt(observedAt: string): string {
  const at = new Date(observedAt);
  if (!Number.isFinite(at.getTime())) throw new Error(`Invalid observedAt: ${observedAt}`);
  return new Date(at.getTime() + SITEMAP_FRESHNESS_TTL_DAYS * 86400000).toISOString();
}
