# AKARFINDER — DATA 200K CLEAN — CANONICAL CONTRACT

## Goal

Reach **200,000 CLEAN listings** that are canonical, deduplicated, traceable, normalized, freshness-aware, and consumable by Search/Map.

A raw row, discovered URL, Thin document, Minimal Live document, source seed, or historical representation does **not** count as CLEAN until it passes this contract.

## Success

The Goal is reached only when all of the following are proven:

- `clean_canonical_total >= 200000`;
- critical dedup collisions = `0`;
- provenance coverage = `100%`;
- every counted row has a stable canonical fingerprint;
- import/reconciliation is idempotent;
- DB reconciliation is documented;
- BEFORE and AFTER snapshots are comparable;
- Search/Map consume the intended canonical corpus without an uncontrolled legacy bypass.

## CLEAN admission contract

A candidate can count toward `clean_canonical_total` only if all mandatory gates pass.

### Mandatory identity

- source domain known;
- source URL known;
- canonical URL derivable and stable;
- provenance lane known;
- canonical fingerprint stable;
- no unresolved critical identity collision.

### Mandatory normalization

- transaction normalized;
- property type normalized;
- city proven;
- district retained only when evidence is sufficient;
- freshness state known.

### Conditional fields

Price, surface, rooms, images and descriptive fields are retained only when their provenance is admissible and the extracted value passes the field-specific validity rules. A missing optional field does not automatically reject the listing.

### Dedup

Every candidate must resolve deterministically to one of:

- `KEEP` — existing canonical row already represents the best known truth;
- `UPDATE` — same canonical listing, candidate improves admissible truth;
- `INSERT` — novel canonical listing;
- `QUARANTINE` — ambiguous identity/provenance/conflict;
- `REJECT` — not admissible.

No candidate is inserted merely because its URL is new.

## Architecture

`Sources → Discovery → Normalisation → Dedup → Canonical CLEAN Corpus → Snapshot → Reconciliation DB → Supabase`

The canonical CLEAN corpus is built offline as far as practical. Supabase is the final source of truth, not the default exploration surface.

## DB doctrine

### Snapshot-first

No production `INSERT`, `UPDATE`, migration, backfill, batch writer activation, or destructive operation is allowed before:

1. PostgreSQL is reachable;
2. the BEFORE snapshot is complete;
3. the active/legacy writer inventory is frozen;
4. the intended reconciliation plan is documented.

### Live reads

Allowed only for:

- the BEFORE snapshot;
- freshness evidence that cannot be obtained offline;
- final validation;
- bounded canary verification.

Routine exploration/debugging must use offline artifacts or repo evidence.

## Writer inventory — verified 2026-09-23

| Writer / surface | Current role | Classification | Required action |
|---|---|---|---|
| `.github/workflows/openserp-github-native-ingestion.yml` → `scripts/openserp/run-ingestion-github-actions.ts` → `lib/openserp-ingestion/national-writer.ts` | scheduled national discovery + direct writes to `discovery_candidates`, `property_listings`, `listing_sources`, clusters/memberships | **REPLACE / PAUSE** | keep scheduled execution read-only until BEFORE snapshot + CLEAN reconciliation contract; converge direct property writes later |
| `.github/workflows/commoncrawl-mass-seed-harvest.yml` | external-index seed reservoir to `source_offer_seeds` + freshness reconciliation | **KEEP / PAUSE** | useful discovery reservoir; no production write before BEFORE snapshot |
| PR #1016 Kaynly/Avito canonical ingestion | gated Avito ID ingestion to `discovery_candidates` | **KEEP CANDIDATE / NON-ACTIVE** | PR is not merged; preserve dry-run-first and ID-level dedup |
| PR #1029 canonical listing representation model | additive read model over legacy physical corpora | **READ MODEL / NOT A WRITER** | use as historical reconciliation evidence only; do not count its 143,121 canonical URLs as CLEAN |

## Historical evidence — not CLEAN counters

Verified historical values:

- PR #39 baseline at that time: 123 persisted Casablanca `property_listings`, 8,484 discovery rows, empty `source_offer_seeds`;
- PR #1029: 143,121 distinct canonical URL representations across `property_listings`, `minimal_live_search_documents_v1`, and `thin_index_search_documents`;
- PR #1029 historical physical counts: `property_listings=19,616`, `minimal_live_search_documents_v1=74,846`, `thin_index_search_documents=77,123`.

These are reconciliation baselines only.

## BEFORE snapshot protocol

The first successful production SQL access must be used to capture the snapshot before any writer is re-enabled.

### Phase A — availability and schema

Read-only only:

- `select now()`;
- table/view inventory for the listing/search/discovery surfaces;
- column inventory for relevant objects;
- indexes / uniqueness constraints needed for idempotence and dedup interpretation.

### Phase B — physical row counts

At minimum:

- `property_listings`;
- `listing_sources`;
- `discovery_candidates`;
- `source_offer_seeds`;
- `minimal_live_search_documents_v1`;
- `thin_index_search_documents`;
- canonical union/read-model objects if present.

### Phase C — quality profile

For each applicable physical listing corpus:

- total rows;
- distinct canonical URLs;
- distinct canonical fingerprints where available;
- NULL/missing city;
- NULL/missing transaction;
- NULL/missing property type;
- NULL/missing price;
- NULL/missing surface;
- missing/invalid provenance;
- freshness distribution;
- source-domain distribution;
- city distribution.

### Phase D — duplicate/collision profile

Measure separately:

- duplicate canonical URL groups;
- duplicate canonical fingerprint groups;
- URL ↔ fingerprint disagreements;
- one URL mapped to multiple source identities;
- one fingerprint mapped to multiple materially incompatible listings;
- orphaned source/listing relationships.

### Phase E — artifacts

Produce:

- `DB_SNAPSHOT_STATUS.json`;
- `DB_SNAPSHOT_STATUS.md`;
- query timestamp and project reference;
- per-query success/failure;
- explicit `UNKNOWN` for any metric not successfully collected.

Never coerce an unavailable metric to zero.

## Snapshot baseline schema

```json
{
  "captured_at": null,
  "project_ref": "kusfiyimwvxblvsrhaes",
  "db_reachable": false,
  "raw_total": null,
  "canonical_distinct": null,
  "clean_candidate": null,
  "quarantine": null,
  "critical_dedup_collisions": null,
  "provenance_coverage_pct": null,
  "tables": {},
  "sources": {},
  "cities": {},
  "nulls": {},
  "duplicates": {},
  "freshness": {},
  "errors": []
}
```

A `null` means **not yet measured**, never zero.

## Reconciliation sequence

1. BEFORE snapshot;
2. freeze and classify all writers;
3. finalize CLEAN decision function;
4. construct offline canonical candidate corpus;
5. dedup/reconcile against snapshot;
6. full dry-run;
7. canary 100;
8. verify quality + idempotence;
9. canary 1,000;
10. controlled batches;
11. reach `>=200,000 CLEAN`;
12. AFTER snapshot;
13. BEFORE ↔ AFTER comparison;
14. Search/Map reader verification;
15. closeout.

## Batch accounting contract

Every apply batch must publish:

`seen / accepted / inserted / updated / duplicate / quarantined / rejected / error`

A batch without these counters is not certifiable.

## Current blocker — 2026-09-23

Supabase project state is reported `ACTIVE_HEALTHY`, but the database is not usable for the required snapshot.

Latest read-only SQL proof:

`FATAL 57P03: database system is not accepting connections — Hot standby mode is disabled`

GitHub live Source Registry checks also reported:

`exceed_egress_quota`

Therefore the CLEAN counter remains **uncertified** and DB work remains blocked.

## Next exact

Keep production writers fail-closed, finish the offline writer inventory, and wait only for a real DB availability signal. On the first verified SQL recovery, capture the complete BEFORE snapshot immediately before any production write is allowed.
