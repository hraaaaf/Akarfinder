export type ExternalRecoveryRecord = {
  source_id: string;
  detail_families: Array<"a" | "pa">;
  indexes: string[];
  newest_snapshot_present: boolean;
};

export type ExternalRecoveryBucket =
  | "likely_recent_unit_candidate"
  | "historical_only_unit_candidate"
  | "project_or_nonunit_candidate"
  | "mixed_family_ambiguous";

export type ExternalRecoveryClassification = ExternalRecoveryRecord & {
  bucket: ExternalRecoveryBucket;
  multi_snapshot_presence: boolean;
};

export function classifyExternalRecoveryRecord(record: ExternalRecoveryRecord): ExternalRecoveryClassification {
  const families = new Set(record.detail_families);
  let bucket: ExternalRecoveryBucket;

  if (families.has("a") && families.has("pa")) {
    bucket = "mixed_family_ambiguous";
  } else if (families.has("pa")) {
    bucket = "project_or_nonunit_candidate";
  } else if (record.newest_snapshot_present) {
    bucket = "likely_recent_unit_candidate";
  } else {
    bucket = "historical_only_unit_candidate";
  }

  return {
    ...record,
    bucket,
    multi_snapshot_presence: new Set(record.indexes).size >= 2,
  };
}

export function summarizeExternalRecovery(records: ExternalRecoveryRecord[]) {
  const classified = records.map(classifyExternalRecoveryRecord);
  const counts = {
    likely_recent_unit_candidate: 0,
    historical_only_unit_candidate: 0,
    project_or_nonunit_candidate: 0,
    mixed_family_ambiguous: 0,
    multi_snapshot_presence: 0,
  };

  for (const item of classified) {
    counts[item.bucket] += 1;
    if (item.multi_snapshot_presence) counts.multi_snapshot_presence += 1;
  }

  return {
    total: classified.length,
    counts,
    records: classified,
    can_certify_current_active_inventory: false,
    interpretation: "External-index evidence only. Newest-snapshot presence is a recency signal, never proof that a listing is currently active.",
  };
}
