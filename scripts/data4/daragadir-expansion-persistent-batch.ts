import {
  PROMOTION_CHANNEL,
  PROMOTION_TTL_DAYS,
  type PromotionSnapshot,
} from "./daragadir-controlled-promotion";
import {
  buildProposedSitemapFreshnessUpdate,
  type SitemapPresenceEvidence,
} from "./daragadir-freshness-evidence-canary";

export const EXPANSION_BATCH_NUMBER = 1;
export const EXPANSION_BATCH_RUN_ID = expansionBatchRunId(EXPANSION_BATCH_NUMBER);

export function expansionBatchRunId(batchNumber: number): string {
  if (!Number.isInteger(batchNumber) || batchNumber < 1 || batchNumber > 5) {
    throw new Error(`Invalid DATA-4.3H batch number: ${batchNumber}`);
  }
  return `data-4-3h-daragadir-batch-${batchNumber}-v1`;
}

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
  batchNumber: number,
): Record<string, unknown> {
  const next = structuredClone(metadata);
  const evidence = typeof next.freshness_evidence === "object" && next.freshness_evidence !== null
    ? { ...(next.freshness_evidence as Record<string, unknown>) }
    : {};
  evidence.controlled_expansion_batch = {
    run_id: expansionBatchRunId(batchNumber),
    batch_number: batchNumber,
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
  batchNumber = EXPANSION_BATCH_NUMBER,
): ExpansionPersistentBatchPlan {
  expansionBatchRunId(batchNumber);
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
      metadata: withExpansionBatchMarker(proposal.proposed.metadata, before, evidence.observedAt, batchNumber),
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
