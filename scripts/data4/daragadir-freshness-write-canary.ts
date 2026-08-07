import {
  SITEMAP_FRESHNESS_CHANNEL,
  SITEMAP_FRESHNESS_TTL_DAYS,
  buildProposedSitemapFreshnessUpdate,
  selectDeterministicCanary,
  type CanarySeedState,
  type SitemapPresenceEvidence,
} from "./daragadir-freshness-evidence-canary";

export const WRITE_CANARY_SIZE = 10;
export const WRITE_CANARY_RUN_ID = "data-4-3e-daragadir-v1";

export interface WriteCanaryPlan {
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

function withRollbackMarker(
  metadata: Record<string, unknown>,
  before: CanarySeedState,
  observedAt: string,
): Record<string, unknown> {
  const next = structuredClone(metadata);
  const evidence = typeof next.freshness_evidence === "object" && next.freshness_evidence !== null
    ? { ...(next.freshness_evidence as Record<string, unknown>) }
    : {};
  evidence.write_canary = {
    run_id: WRITE_CANARY_RUN_ID,
    channel: SITEMAP_FRESHNESS_CHANNEL,
    ttl_days: SITEMAP_FRESHNESS_TTL_DAYS,
    observed_at: observedAt,
    rollback_snapshot: {
      freshness_status: before.freshnessStatus,
      fresh_last_seen_at: before.freshLastSeenAt,
      fresh_channels: [...before.freshChannels],
      metadata: before.metadata ? structuredClone(before.metadata) : null,
    },
  };
  return { ...next, freshness_evidence: evidence };
}

export function buildWriteCanaryPlan(
  before: CanarySeedState,
  evidence: SitemapPresenceEvidence,
): WriteCanaryPlan {
  if (before.freshnessStatus !== "seed_only") {
    throw new Error(`Write canary must begin seed_only: ${before.canonicalUrl}`);
  }
  const proposal = buildProposedSitemapFreshnessUpdate(before, evidence);
  return {
    canonicalUrl: proposal.canonicalUrl,
    before: structuredClone(proposal.before),
    proposed: {
      ...proposal.proposed,
      metadata: withRollbackMarker(proposal.proposed.metadata, before, evidence.observedAt),
    },
    rollback: structuredClone(proposal.rollback),
  };
}

export function selectWriteCanary<T extends { canonicalUrl: string }>(rows: T[]): T[] {
  return selectDeterministicCanary(rows, WRITE_CANARY_SIZE);
}
