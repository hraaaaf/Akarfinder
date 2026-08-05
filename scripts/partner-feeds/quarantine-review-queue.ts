import type { PartnerMappedRow } from "./canonical-mapping.js";
import type { DedupDecisionResult } from "./dedup-change-detection.js";

export const PARTNER_QUARANTINE_VERSION = "b3.4.5-v1" as const;

export type ReviewQueueStatus = "pending" | "in_review" | "accepted" | "rejected" | "merged";
export type ReviewPriority = "low" | "normal" | "high" | "critical";

export type QuarantineSnapshot = {
  snapshot_version: typeof PARTNER_QUARANTINE_VERSION;
  row_status: PartnerMappedRow["row_status"];
  canonical_payload: PartnerMappedRow["canonical_payload"];
  validation_summary: PartnerMappedRow["validation_summary"];
  dedup_decision: DedupDecisionResult;
  publication_eligible: false;
};

export type ReviewQueuePlan = {
  required: boolean;
  status: ReviewQueueStatus;
  priority: ReviewPriority;
  reason_code: string;
  publication_eligible: false;
};

export function buildQuarantineSnapshot(
  mapped: PartnerMappedRow,
  dedup: DedupDecisionResult,
): QuarantineSnapshot {
  return {
    snapshot_version: PARTNER_QUARANTINE_VERSION,
    row_status: mapped.row_status,
    canonical_payload: mapped.canonical_payload,
    validation_summary: mapped.validation_summary,
    dedup_decision: dedup,
    publication_eligible: false,
  };
}

export function planReviewQueue(
  mapped: PartnerMappedRow,
  dedup: DedupDecisionResult,
): ReviewQueuePlan {
  if (mapped.row_status === "invalid" || dedup.decision === "invalid") {
    return {
      required: true,
      status: "pending",
      priority: "critical",
      reason_code: "invalid_partner_row",
      publication_eligible: false,
    };
  }

  if (dedup.decision === "manual_review") {
    return {
      required: true,
      status: "pending",
      priority: "high",
      reason_code: "ambiguous_property_match",
      publication_eligible: false,
    };
  }

  if (dedup.decision === "update_offer") {
    return {
      required: true,
      status: "pending",
      priority: "high",
      reason_code: "material_offer_change",
      publication_eligible: false,
    };
  }

  if (mapped.row_status === "warning") {
    return {
      required: true,
      status: "pending",
      priority: "normal",
      reason_code: "quality_warnings",
      publication_eligible: false,
    };
  }

  if (dedup.decision === "duplicate") {
    return {
      required: false,
      status: "merged",
      priority: "low",
      reason_code: "exact_duplicate_no_action",
      publication_eligible: false,
    };
  }

  return {
    required: true,
    status: "pending",
    priority: "normal",
    reason_code: dedup.decision,
    publication_eligible: false,
  };
}
