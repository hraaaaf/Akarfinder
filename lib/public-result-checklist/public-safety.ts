import {
  FORBIDDEN_PUBLIC_RESULT_CHECKLIST_WORDING,
  PUBLIC_RESULT_CHECKLIST_MAX_ITEMS,
} from "./checklist-rules";
import type { PublicResultChecklistSummary } from "./types";

const FORBIDDEN_KEYS = [
  "value_low",
  "value_median",
  "value_high",
  "evidence_ref",
  "cache_key",
  "similarity_score",
  "similarity_group_id",
  "contact",
  "gallery",
  "image",
  "phone",
  "email",
];

const NUMERIC_SCORE_PATTERN = /\b\d{1,3}\s*(\/\s*(10|20|100)\b|%)/;

export function assertPublicResultChecklistSafety(
  summary: PublicResultChecklistSummary,
): void {
  if (summary.items.length > PUBLIC_RESULT_CHECKLIST_MAX_ITEMS) {
    throw new Error("Public result checklist exceeds max item count");
  }

  const serialized = JSON.stringify(summary).toLowerCase();

  for (const wording of FORBIDDEN_PUBLIC_RESULT_CHECKLIST_WORDING) {
    if (serialized.includes(wording.toLowerCase())) {
      throw new Error(`Unsafe public checklist wording detected: ${wording}`);
    }
  }

  for (const key of FORBIDDEN_KEYS) {
    if (serialized.includes(`"${key.toLowerCase()}"`)) {
      throw new Error(`Unsafe public checklist field exposure detected: ${key}`);
    }
  }

  for (const item of summary.items) {
    if (NUMERIC_SCORE_PATTERN.test(item.label)) {
      throw new Error(
        `Public result checklist item appears to contain a numeric score: "${item.label}"`,
      );
    }
  }
}
