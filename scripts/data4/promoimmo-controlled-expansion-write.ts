import {
  PROMOIMMO_CHANNEL,
  PROMOIMMO_DOMAIN,
  PROMOIMMO_TTL_DAYS,
  samePromoImmoOrigin,
  type SeedSnapshot,
} from "./promoimmo-sitemap-canary";

export const DATA_4_5B_TARGET_TOTAL = 500;
export const DATA_4_5B_BASELINE = 50;
export const DATA_4_5B_MAX_NEW_ROWS = 450;
export const DATA_4_5B_BATCH_SIZES = [100, 100, 100, 100, 50] as const;
export const DATA_4_5B_EVIDENCE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
export const DATA_4_5B_RUN_PREFIX = "data-4-5b-promoimmo-controlled-expansion" as const;

export type CurrentSitemapEvidenceRow = {
  canonicalUrl: string;
  sitemapUrl: string;
};

export type CurrentSitemapEvidence = {
  schemaVersion: "data-4-5b-promoimmo-current-sitemap-evidence-v1";
  sourceDomain: typeof PROMOIMMO_DOMAIN;
  channel: typeof PROMOIMMO_CHANNEL;
  observedAt: string;
  collector: string;
  sourceSiteDetailRequests: 0;
  rows: CurrentSitemapEvidenceRow[];
};

export type ExpansionWriteCandidate = {
  canonicalUrl: string;
  qualityScore: number;
  publicSearchPresent: boolean;
  technicalDisplayPresent: boolean;
  qualityTier: string | null;
  displayEligibility: string | null;
  exactCrossSourceCollision: boolean;
};

export type ExpansionWritePlanRow = {
  batchNumber: number;
  canonicalUrl: string;
  before: SeedSnapshot;
  evidence: CurrentSitemapEvidenceRow & { observedAt: string };
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
};

function cloneMetadata(metadata: Record<string, unknown> | null): Record<string, unknown> {
  return metadata ? structuredClone(metadata) : {};
}

function validIso(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

export function expectedBatchNumber(currentPersistentRows: number): number | null {
  if (currentPersistentRows === 50) return 1;
  if (currentPersistentRows === 150) return 2;
  if (currentPersistentRows === 250) return 3;
  if (currentPersistentRows === 350) return 4;
  if (currentPersistentRows === 450) return 5;
  if (currentPersistentRows === 500) return null;
  throw new Error(`DATA-4.5B invalid checkpoint: ${currentPersistentRows}`);
}

export function expectedBatchSize(currentPersistentRows: number): number {
  const batch = expectedBatchNumber(currentPersistentRows);
  return batch === null ? 0 : DATA_4_5B_BATCH_SIZES[batch - 1]!;
}

export function validateCurrentSitemapEvidence(
  evidence: CurrentSitemapEvidence,
  now = new Date(),
): Map<string, CurrentSitemapEvidenceRow> {
  if (evidence.schemaVersion !== "data-4-5b-promoimmo-current-sitemap-evidence-v1") throw new Error("DATA-4.5B wrong evidence schema");
  if (evidence.sourceDomain !== PROMOIMMO_DOMAIN) throw new Error("DATA-4.5B wrong evidence source");
  if (evidence.channel !== PROMOIMMO_CHANNEL) throw new Error("DATA-4.5B wrong evidence channel");
  if (evidence.sourceSiteDetailRequests !== 0) throw new Error("DATA-4.5B detail fetch evidence forbidden");
  if (!validIso(evidence.observedAt)) throw new Error("DATA-4.5B invalid evidence timestamp");
  const age = now.getTime() - Date.parse(evidence.observedAt);
  if (age < 0 || age > DATA_4_5B_EVIDENCE_MAX_AGE_MS) throw new Error(`DATA-4.5B evidence expired: ${age}ms`);
  if (!evidence.collector.trim()) throw new Error("DATA-4.5B missing evidence collector");
  if (!Array.isArray(evidence.rows) || evidence.rows.length === 0) throw new Error("DATA-4.5B empty sitemap evidence");

  const byUrl = new Map<string, CurrentSitemapEvidenceRow>();
  for (const row of evidence.rows) {
    if (!samePromoImmoOrigin(row.canonicalUrl) || !samePromoImmoOrigin(row.sitemapUrl)) throw new Error(`DATA-4.5B invalid evidence origin: ${row.canonicalUrl}`);
    if (byUrl.has(row.canonicalUrl)) throw new Error(`DATA-4.5B duplicate evidence URL: ${row.canonicalUrl}`);
    byUrl.set(row.canonicalUrl, row);
  }
  return byUrl;
}

export function selectExpansionBatch(
  candidates: ExpansionWriteCandidate[],
  evidence: CurrentSitemapEvidence,
  currentPersistentRows: number,
  now = new Date(),
): ExpansionWriteCandidate[] {
  const size = expectedBatchSize(currentPersistentRows);
  if (size === 0) return [];
  const evidenceByUrl = validateCurrentSitemapEvidence(evidence, now);
  const selected = candidates
    .filter((row) => evidenceByUrl.has(row.canonicalUrl))
    .filter((row) => row.publicSearchPresent && row.technicalDisplayPresent)
    .filter((row) => ["A", "B"].includes(row.qualityTier ?? ""))
    .filter((row) => row.displayEligibility?.startsWith("eligible_") === true)
    .filter((row) => !row.exactCrossSourceCollision)
    .sort((a, b) => b.qualityScore - a.qualityScore || a.canonicalUrl.localeCompare(b.canonicalUrl))
    .slice(0, size);
  if (selected.length !== size) throw new Error(`DATA-4.5B current sitemap cohort too small: expected ${size}, got ${selected.length}`);
  return selected;
}

function addExpansionEvidence(
  metadata: Record<string, unknown> | null,
  before: SeedSnapshot,
  evidence: CurrentSitemapEvidenceRow & { observedAt: string },
  batchNumber: number,
): Record<string, unknown> {
  const base = cloneMetadata(metadata);
  const freshnessEvidence = typeof base.freshness_evidence === "object" && base.freshness_evidence !== null
    ? { ...(base.freshness_evidence as Record<string, unknown>) }
    : {};
  freshnessEvidence.sitemap_presence = {
    observed_at: evidence.observedAt,
    sitemap_url: evidence.sitemapUrl,
    channel: PROMOIMMO_CHANNEL,
    ttl_days: PROMOIMMO_TTL_DAYS,
  };
  freshnessEvidence.controlled_expansion_batch = {
    run_id: `${DATA_4_5B_RUN_PREFIX}-batch-${batchNumber}-v1`,
    batch_number: batchNumber,
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

export function buildExpansionWritePlan(
  selected: ExpansionWriteCandidate[],
  seedByUrl: Map<string, SeedSnapshot>,
  evidence: CurrentSitemapEvidence,
  currentPersistentRows: number,
  now = new Date(),
): ExpansionWritePlanRow[] {
  const evidenceByUrl = validateCurrentSitemapEvidence(evidence, now);
  const batchNumber = expectedBatchNumber(currentPersistentRows);
  if (batchNumber === null) {
    if (selected.length !== 0) throw new Error("DATA-4.5B target already reached");
    return [];
  }
  const expected = expectedBatchSize(currentPersistentRows);
  if (selected.length !== expected) throw new Error(`DATA-4.5B wrong batch size: expected ${expected}, got ${selected.length}`);

  return selected.map((candidate) => {
    const before = seedByUrl.get(candidate.canonicalUrl);
    const rawEvidence = evidenceByUrl.get(candidate.canonicalUrl);
    if (!before) throw new Error(`DATA-4.5B missing seed snapshot: ${candidate.canonicalUrl}`);
    if (!rawEvidence) throw new Error(`DATA-4.5B missing current sitemap evidence: ${candidate.canonicalUrl}`);
    if (before.freshnessStatus !== "seed_only") throw new Error(`DATA-4.5B row no longer seed_only: ${candidate.canonicalUrl}`);
    if (before.freshChannels.includes(PROMOIMMO_CHANNEL)) throw new Error(`DATA-4.5B row already sitemap-confirmed: ${candidate.canonicalUrl}`);
    const rowEvidence = { ...rawEvidence, observedAt: evidence.observedAt };
    return {
      batchNumber,
      canonicalUrl: candidate.canonicalUrl,
      before: structuredClone(before),
      evidence: rowEvidence,
      proposed: {
        freshnessStatus: "fresh_confirmed",
        freshLastSeenAt: evidence.observedAt,
        freshChannels: [...new Set([...before.freshChannels, PROMOIMMO_CHANNEL])].sort(),
        metadata: addExpansionEvidence(before.metadata, before, rowEvidence, batchNumber),
      },
      rollback: {
        freshnessStatus: before.freshnessStatus,
        freshLastSeenAt: before.freshLastSeenAt,
        freshChannels: [...before.freshChannels],
        metadata: before.metadata ? structuredClone(before.metadata) : null,
        updatedAtAuditOnly: before.updatedAt,
      },
    };
  });
}

export function assertPostBatchCertification(input: {
  expectedRows: number;
  publicSearchRows: number;
  technicalDisplayRows: number;
  qualityTierABRows: number;
  projectionRows: number;
  exactCollisionRows: number;
}): void {
  const { expectedRows } = input;
  if (input.publicSearchRows !== expectedRows) throw new Error("DATA-4.5B Search certification drift");
  if (input.technicalDisplayRows !== expectedRows) throw new Error("DATA-4.5B display certification drift");
  if (input.qualityTierABRows !== expectedRows) throw new Error("DATA-4.5B quality certification drift");
  if (input.projectionRows !== expectedRows) throw new Error("DATA-4.5B projection certification drift");
  if (input.exactCollisionRows !== 0) throw new Error("DATA-4.5B collision certification drift");
}
