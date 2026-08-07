import {
  PROMOTION_CHANNEL,
  PROMOTION_TTL_DAYS,
  INITIAL_PERSISTENT_BATCH_SIZE,
  selectPromotionBatch,
  type PromotionSnapshot,
} from "./daragadir-controlled-promotion";
import { buildProposedSitemapFreshnessUpdate, type SitemapPresenceEvidence } from "./daragadir-freshness-evidence-canary";

export const PERSISTENT_BATCH_RUN_ID = "data-4-3g-daragadir-v1";
export const PERSISTENT_BATCH_SIZE = INITIAL_PERSISTENT_BATCH_SIZE;

export interface PersistentBatchPlan {
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

function withPersistentBatchMarker(metadata: Record<string, unknown>, before: PromotionSnapshot, observedAt: string): Record<string, unknown> {
  const next = structuredClone(metadata);
  const evidence = typeof next.freshness_evidence === "object" && next.freshness_evidence !== null
    ? { ...(next.freshness_evidence as Record<string, unknown>) }
    : {};
  evidence.persistent_batch = {
    run_id: PERSISTENT_BATCH_RUN_ID,
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

export function buildPersistentBatchPlan(before: PromotionSnapshot, evidence: SitemapPresenceEvidence): PersistentBatchPlan {
  if (before.freshnessStatus !== "seed_only") throw new Error(`Persistent batch must begin seed_only: ${before.canonicalUrl}`);
  if (before.freshChannels.includes(PROMOTION_CHANNEL)) throw new Error(`Persistent batch channel already present: ${before.canonicalUrl}`);

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
      metadata: withPersistentBatchMarker(proposal.proposed.metadata, before, evidence.observedAt),
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

export function selectPersistentBatch<T extends { canonicalUrl: string }>(rows: T[]): T[] {
  return selectPromotionBatch(rows, PERSISTENT_BATCH_SIZE);
}
