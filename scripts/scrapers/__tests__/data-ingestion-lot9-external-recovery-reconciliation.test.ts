import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyExternalRecoveryRecord,
  summarizeExternalRecovery,
} from "../../../data-ingestion/sources/mubawab/external-recovery-reconciliation";

test("classifies newest a-only records as recent unit candidates without certifying activity", () => {
  const result = classifyExternalRecoveryRecord({
    source_id: "1",
    detail_families: ["a"],
    indexes: ["CC-MAIN-2026-34"],
    newest_snapshot_present: true,
  });
  assert.equal(result.bucket, "likely_recent_unit_candidate");
  assert.equal(result.multi_snapshot_presence, false);
});

test("keeps old-only, pa-only and mixed-family evidence separate", () => {
  const summary = summarizeExternalRecovery([
    { source_id: "1", detail_families: ["a"], indexes: ["CC-MAIN-2026-25"], newest_snapshot_present: false },
    { source_id: "2", detail_families: ["pa"], indexes: ["CC-MAIN-2026-34"], newest_snapshot_present: true },
    { source_id: "3", detail_families: ["a", "pa"], indexes: ["CC-MAIN-2026-30", "CC-MAIN-2026-34"], newest_snapshot_present: true },
  ]);
  assert.equal(summary.counts.historical_only_unit_candidate, 1);
  assert.equal(summary.counts.project_or_nonunit_candidate, 1);
  assert.equal(summary.counts.mixed_family_ambiguous, 1);
  assert.equal(summary.counts.multi_snapshot_presence, 1);
  assert.equal(summary.can_certify_current_active_inventory, false);
});
