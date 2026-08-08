import {
  PROMOTION_CHANNEL,
  PROMOTION_TTL_DAYS,
  type PromotionSnapshot,
} from "./daragadir-controlled-promotion";
import {
  buildProposedSitemapFreshnessUpdate,
  type SitemapPresenceEvidence,
} from "./daragadir-freshness-evidence-canary";

export const EXPANSION_BATCH_RUN_ID = "data-4-3h-daragadir-batch-1-v1";
export const EXPANSION_BATCH_NUMBER = 1;

export interface ExpansionPersistentBatchPlan {
  canonicalUrl: string;
  before: PromotionSnapshot;
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
    updatedAtAuditOnly: string | null;
  };
}

function withExpansionBatchMarker(
  metadata: Record<string, unknown>,
  before: PromotionSnapshot,
  observedAt: string,
): Record<string, unknown> {
  const next = structuredClone(metadata);
  const evidence = typeof next.freshness_evidence === "object" && next.freshness_evidence !== null
    ? { ...(next.freshness_evidence as Record<string, unknown>) }
    : {};
  evidence.controlled_expansion_batch = {
    run_id: EXPANSION_BATCH_RUN_ID,
    batch_number: EXPANSION_BATCH_NUMBER,
    channel: PROMOTION_CHANNEL,
    ttl_days: PROMOTION_TTL_DAYS,
    observed_at: observedAt,
    rollback_snapshot: {
      freshness_status: before.freshnessStatus,
      fresh_last_seen_at: before.freshLastSeenAt,
      fresh_channels: [...before.freshChannels],
      metadata: before.metadata ? structuredClone(before.metadata) : null,
      updated_at_audit_only: before.updatedAt,
    },
  };
  return { ...next, freshness_evidence: evidence };
}

export function buildExpansionPersistentBatchPlan(
  before: PromotionSnapshot,
  evidence: SitemapPresenceEvidence,
): ExpansionPersistentBatchPlan {
  if (before.freshnessStatus !== "seed_only") {
    throw new Error(`Expansion batch must begin seed_only: ${before.canonicalUrl}`);
  }
  if (before.freshChannels.includes(PROMOTION_CHANNEL)) {
    throw new Error(`Expansion batch channel already present: ${before.canonicalUrl}`);
  }

  const proposal = buildProposedSitemapFreshnessUpdate({
    canonicalUrl: before.canonicalUrl,
    freshnessStatus: before.freshnessStatus,
    freshLastSeenAt: before.freshLastSeenAt,
    freshChannels: before.freshChannels,
    metadata: before.metadata,
  }, evidence);

  return {
    canonicalUrl: proposal.canonicalUrl,
    before: structuredClone(before),
    proposed: {
      ...proposal.proposed,
      metadata: withExpansionBatchMarker(proposal.proposed.metadata, before, evidence.observedAt),
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
