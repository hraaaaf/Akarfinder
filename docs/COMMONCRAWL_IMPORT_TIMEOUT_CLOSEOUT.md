# Common Crawl Import Timeout Hardening — Closeout

Status: **CLOSED / MERGED / RUNTIME CERTIFIED**

## Goal

Prevent Common Crawl remainder seed imports from failing on PostgreSQL statement timeout (`57014`) while preserving fail-closed policy and idempotent seed ingestion.

## Change

PR #910, squash-merged to `main` as:

`9120e3734da9dff47234e4abac1ab83a7dd86c84`

The importer now:

- reduces `source_offer_seeds` upsert chunks from 500 to 100 rows;
- retries transient / statement-timeout Supabase failures with a bounded 4-attempt retry;
- reports structured Supabase failures instead of `[object Object]`;
- emits `upsert_chunk_size` in runtime summaries.

No schema change. No source-policy change. No freshness-semantics change. No Vercel deployment.

## Runtime proof

Canonical push run on merged `main`:

- Workflow: `Common Crawl Mass Seed Harvest`
- Run: `32829365500`
- Commit: `9120e3734da9dff47234e4abac1ab83a7dd86c84`
- Conclusion: **success**

Write mode was enabled on the push run. The following stages completed successfully:

1. canary harvest;
2. canary seed import;
3. remainder harvest;
4. remainder seed import + exact freshness reconciliation;
5. provenance report;
6. artifact upload.

### Canary import

- status: `APPLIED`
- raw / authorized / validated rows: 537 / 537 / 537
- rejected rows: 0
- upsert chunk size: 100
- seed rows before / after: 61,948 / 61,948

### Remainder import

- status: `APPLIED`
- raw / authorized / validated rows: 540 / 540 / 540
- rejected rows: 0
- upsert chunk size: 100
- seed rows before / after: 61,948 / 61,948
- newly inserted rows: 0 (idempotent replay)

### Freshness reconciliation

- status: `APPLIED`
- total seeds: 61,948
- exact fresh overlap: 3,463
- fresh confirmed: 990
- aging: 2,473
- stale: 0
- seed only: 58,485
- accepted fresh observations: 13,627
- changed rows: 0
- protected foreign-channel rows: 3,456

### Provenance

- Common Crawl seeds: 44,767
- created in last 24h: 2,224
- domains represented: 7
- provenance: `seed_provider = commoncrawl_cdx`

No PostgreSQL `57014` / statement-timeout failure occurred during the certified runtime run.

## Known non-blocking observations

Common Crawl CDX returned multiple transport failures / HTTP 503s for some domain/index combinations. These were handled by bounded retry and fail-soft harvesting and did not prevent successful seed import, reconciliation, provenance reporting, or workflow completion. They are a separate upstream availability concern, not the resolved database-import timeout incident.

## Success criterion

Met: a real `main` write-mode run completed the remainder import and reconciliation with 100-row chunks and without PostgreSQL statement timeout.

## Artifact

Run `32829365500` uploaded `commoncrawl-registry-mass-seeds`, artifact ID `9557054242`.
