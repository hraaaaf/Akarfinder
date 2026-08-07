import { SITEMAP_FRESHNESS_CHANNEL, SITEMAP_FRESHNESS_TTL_DAYS, selectDeterministicCanary } from "./daragadir-freshness-evidence-canary";

export const INITIAL_PERSISTENT_BATCH_SIZE = 50;
export const MAX_BATCH_SIZE = 100;
export const MAX_CUMULATIVE_ROWS_BEFORE_RECERTIFICATION = 500;
export const MAX_DRIFT_RATIO = 0.01;
export const PROMOTION_CHANNEL = SITEMAP_FRESHNESS_CHANNEL;
export const PROMOTION_TTL_DAYS = SITEMAP_FRESHNESS_TTL_DAYS;

export type PromotionStopReason =
  | "REGISTRY_NOT_ELIGIBLE"
  | "REGISTRY_REVIEW_EXPIRED"
  | "SITEMAP_SIGNAL_MISSING"
  | "DRIFT_ABOVE_THRESHOLD"
  | "BATCH_TOO_LARGE"
  | "CUMULATIVE_CAP_REACHED";

export interface PromotionBoundary {
  registryEligible: boolean;
  registryReviewStatus: string | null;
  sitemapSignalPresent: boolean;
  requestedBatchSize: number;
  cumulativeAppliedRows: number;
  candidateRows: number;
  driftedRows: number;
}

export interface PromotionDecision {
  allowed: boolean;
  stopReasons: PromotionStopReason[];
  effectiveBatchSize: number;
  driftRatio: number;
}

export interface PromotionSnapshot {
  canonicalUrl: string;
  freshnessStatus: string;
  freshLastSeenAt: string | null;
  freshChannels: string[];
  metadata: Record<string, unknown> | null;
  updatedAt: string | null;
}

export interface RollbackSemantics {
  restoreFreshnessStatus: boolean;
  restoreFreshLastSeenAt: boolean;
  restoreFreshChannels: boolean;
  restoreMetadata: boolean;
  restoreUpdatedAt: false;
  updatedAtSemantics: "AUDIT_TRAIL_NON_ROLLBACKABLE";
}

export const ROLLBACK_SEMANTICS: RollbackSemantics = {
  restoreFreshnessStatus: true,
  restoreFreshLastSeenAt: true,
  restoreFreshChannels: true,
  restoreMetadata: true,
  restoreUpdatedAt: false,
  updatedAtSemantics: "AUDIT_TRAIL_NON_ROLLBACKABLE",
};

function isReviewExpired(status: string | null): boolean {
  return status === "expired" || status === "overdue" || status === "blocked";
}

export function evaluatePromotionBoundary(boundary: PromotionBoundary): PromotionDecision {
  const stopReasons: PromotionStopReason[] = [];
  const driftRatio = boundary.candidateRows > 0 ? boundary.driftedRows / boundary.candidateRows : 1;

  if (!boundary.registryEligible) stopReasons.push("REGISTRY_NOT_ELIGIBLE");
  if (isReviewExpired(boundary.registryReviewStatus)) stopReasons.push("REGISTRY_REVIEW_EXPIRED");
  if (!boundary.sitemapSignalPresent) stopReasons.push("SITEMAP_SIGNAL_MISSING");
  if (driftRatio > MAX_DRIFT_RATIO) stopReasons.push("DRIFT_ABOVE_THRESHOLD");
  if (boundary.requestedBatchSize > MAX_BATCH_SIZE) stopReasons.push("BATCH_TOO_LARGE");
  if (boundary.cumulativeAppliedRows >= MAX_CUMULATIVE_ROWS_BEFORE_RECERTIFICATION) stopReasons.push("CUMULATIVE_CAP_REACHED");

  const remainingBeforeRecertification = Math.max(0, MAX_CUMULATIVE_ROWS_BEFORE_RECERTIFICATION - boundary.cumulativeAppliedRows);
  const effectiveBatchSize = stopReasons.length === 0
    ? Math.min(boundary.requestedBatchSize, MAX_BATCH_SIZE, remainingBeforeRecertification, Math.max(0, boundary.candidateRows - boundary.driftedRows))
    : 0;

  return { allowed: stopReasons.length === 0 && effectiveBatchSize > 0, stopReasons, effectiveBatchSize, driftRatio };
}

export function selectPromotionBatch<T extends { canonicalUrl: string }>(rows: T[], size = INITIAL_PERSISTENT_BATCH_SIZE): T[] {
  if (!Number.isInteger(size) || size <= 0 || size > MAX_BATCH_SIZE) throw new Error(`Invalid promotion batch size: ${size}`);
  return selectDeterministicCanary(rows, size);
}

export function snapshotPromotionRow(row: PromotionSnapshot): PromotionSnapshot {
  return structuredClone(row);
}

export function isPromotionCandidate(snapshot: PromotionSnapshot): boolean {
  return snapshot.freshnessStatus === "seed_only" && !snapshot.freshChannels.includes(PROMOTION_CHANNEL);
}
