# OpenSERP Atomic Discovery Candidate Upsert — Closeout

Status: **CLOSED / MERGED / RUNTIME CERTIFIED**

## Goal

Eliminate the `discovery_candidates` collision caused by PostgREST's 1,000-row lookup ceiling and the non-atomic SELECT → INSERT/UPDATE writer path.

## Resolution

PR #878 was merged as `5a66e7c8312253794f474bf73ddd7a5aff6b515b`.

The writer now uses service-role-only `upsert_discovery_candidates_batch(jsonb)` with PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE` in bounded 25-row batches. The old capped discovery lookup path is gone.

## Regression proof

OpenSERP Native Ingestion run `32766339030` on `main` completed successfully.

The mandatory atomic regression passed 3/3:

- handles >1,000 existing conflicts without duplicate insertion;
- tolerates parallel callers on overlapping idempotency keys;
- writer uses the atomic RPC and no longer performs the capped discovery lookup.

## Runtime proof

The scheduled production-mode run executed two acquisition waves. In both waves the live writer emitted `writer_discovery_candidates_atomic_upsert` DB calls in bounded batches, including multiple 25-row batches, and every atomic-upsert call completed with:

- `status: success`
- `timeout: false`
- `aborted: false`

No `discovery_candidates_idempotency_idx` collision occurred.

The workflow itself completed successfully.

## Separate observation

The same run contains `writer_property_listings_upsert` calls with `status: db_error`. This is **not** the resolved atomic-discovery-candidate incident and should be handled as a separate ingestion defect.

Engine-level DuckDuckGo timeouts and Ecosia 403s were also observed and were handled by fallback logic; they are unrelated to the atomic database collision.

## Success criterion

Met: the >1,000-key regression passes and real scheduled writes use the atomic RPC successfully without idempotency collision.

No Vercel deployment.
