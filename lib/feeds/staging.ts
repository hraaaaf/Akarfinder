// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#8/10) -- Direct Feeds Ingestion
// Capability. Staging pipeline: parse (elsewhere) -> validate -> canonicalize
// -> dedupe -> admission decision. Pure function, no DB writes -- this is a
// CAPABILITY, not a live partner integration. Reuses the project's existing
// canonicalizeSourceUrl (lib/openserp-ingestion/utils.ts) unmodified, same
// discipline as every other ingestion path in this codebase: no second
// canonicalization implementation.

import { canonicalizeSourceUrl } from "../openserp-ingestion/utils.js";
import { validateFeedRow, isValidationError, type RawFeedRow, type ValidatedFeedRow, type FeedValidationError } from "./schema.js";

export type FeedIdentityKey = string;

// Idempotence identity: partner/source + external_id is the primary key.
// Falls back to canonical source_url ONLY when external_id is absent (and
// validateFeedRow already guarantees at least one of the two is present).
// Never title alone -- a formulaic "Appartement a vendre 80m2 a Sale" title
// is not a stable identity (see the #6/10 shadow audit finding on exactly
// this kind of generic title).
export function computeFeedIdentityKey(row: ValidatedFeedRow): FeedIdentityKey | null {
  if (row.external_id) return `${row.source_name}::external:${row.external_id}`;
  if (row.source_url) {
    const canonical = canonicalizeSourceUrl(row.source_url);
    if (canonical) return `${row.source_name}::url:${canonical}`;
  }
  return null;
}

export type StagedFeedAction = "create" | "update" | "duplicate_skipped" | "delete" | "unpublish";

export type StagedFeedRow = {
  identity_key: FeedIdentityKey;
  row: ValidatedFeedRow;
  canonical_source_url: string | null;
  action: StagedFeedAction;
};

export type FeedStagingResult = {
  total_input_rows: number;
  staged_rows: number;
  rejected_rows: FeedValidationError[];
  staged: StagedFeedRow[];
  duplicate_count: number;
  action_counts: Record<StagedFeedAction, number>;
};

// existingIdentityKeys: the set of identity keys already staged/admitted in
// a PRIOR run for this partner -- lets the same pure function decide create
// vs update without any DB coupling. The real IO wrapper (not built in this
// mission, matching #4/#5's "code/tests only" precedent) would populate
// this from a real lookup before calling stageFeed.
export function stageFeed(rawRows: RawFeedRow[], existingIdentityKeys: ReadonlySet<FeedIdentityKey> = new Set()): FeedStagingResult {
  const rejected: FeedValidationError[] = [];
  const staged: StagedFeedRow[] = [];
  const seenThisRun = new Set<FeedIdentityKey>();
  let duplicateCount = 0;
  const actionCounts: Record<StagedFeedAction, number> = { create: 0, update: 0, duplicate_skipped: 0, delete: 0, unpublish: 0 };

  rawRows.forEach((raw, i) => {
    const validated = validateFeedRow(raw, i);
    if (isValidationError(validated)) {
      rejected.push(validated);
      return;
    }

    const identityKey = computeFeedIdentityKey(validated);
    if (!identityKey) {
      rejected.push({ row_index: i, external_id: validated.external_id, title: validated.title, reason: "no stable identity key (neither external_id nor a canonicalizable source_url)" });
      return;
    }

    const canonicalSourceUrl = validated.source_url ? canonicalizeSourceUrl(validated.source_url) : null;

    if (seenThisRun.has(identityKey)) {
      duplicateCount += 1;
      actionCounts.duplicate_skipped += 1;
      staged.push({ identity_key: identityKey, row: validated, canonical_source_url: canonicalSourceUrl, action: "duplicate_skipped" });
      return;
    }
    seenThisRun.add(identityKey);

    let action: StagedFeedAction;
    if (validated.update_signal === "delete") action = "delete";
    else if (validated.update_signal === "unpublish") action = "unpublish";
    else action = existingIdentityKeys.has(identityKey) ? "update" : "create";

    actionCounts[action] += 1;
    staged.push({ identity_key: identityKey, row: validated, canonical_source_url: canonicalSourceUrl, action });
  });

  return {
    total_input_rows: rawRows.length,
    staged_rows: staged.length,
    rejected_rows: rejected,
    staged,
    duplicate_count: duplicateCount,
    action_counts: actionCounts,
  };
}
