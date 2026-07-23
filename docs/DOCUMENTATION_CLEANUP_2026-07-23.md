# Documentation Cleanup — 2026-07-23

Status: documentation-only consolidation record

This file records the rationale for the July 2026 cleanup. It is not a source of product truth; use `README.md`, `MASTER_CONTEXT.md` and `CURRENT_STATE.md` for current guidance.

## Problem found

The `docs/` directory mixed three incompatible categories without hierarchy:

1. durable product/architecture documents;
2. active technical contracts;
3. chronological mission/audit snapshots.

Several top-level documents were materially stale and could mislead an agent, including claims that the Production app was not built, that SQLite/mocks represented the current stack, that a reconciliation branch had not yet been merged, or that old OpenSERP cadences/domain/query counts were permanent architecture.

## Actions

### Added

- `README.md` — documentation map and authority hierarchy.
- `MASTER_CONTEXT.md` — durable canonical vision/invariants.
- `CURRENT_STATE.md` — implementation snapshot with explicit repo-vs-Production distinction.

### Rewritten

- `START.md`
- `PRODUCT.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SCRAPING.md`
- `MONETIZATION.md`
- `DECISIONS.md`
- `CANONICAL_BASELINE.md`
- `SESSION.md`

### Removed as superseded mission/audit snapshots

- `OPENSERP_AUTOMATED_INGESTION_30MIN_1.md`
- `OPENSERP_AUTOMATED_INGESTION_ARCHITECTURE.md`
- `OPENSERP_NATIVE_CRON_COMPLIANCE_AUDIT_1.md`
- `OPENSERP_QUERY_COVERAGE_STRATEGY.md`
- `OPENSERP_SERVERLESS_DB_CALL_AUDIT.md`
- `OPENSERP_SERVERLESS_FILESYSTEM_AUDIT.md`
- `OPENSERP_SERVERLESS_STATE_REAL_RUN_VALIDATION_2.md`
- `OPENSERP_SERVERLESS_TIME_BUDGET_AND_LOCK_SAFETY_1.md`
- `OPENSERP_SOURCE_ADMISSION_POLICY.md`

Their historical evidence remains recoverable through Git history and, where applicable, `data/audits/`.

## Deliberately retained

Current domain contracts such as the Property/Analysis/Intelligence/Profile/Professional/Release documents were retained.

Historical Market Index design/migration/security documents were also retained where they can still provide schema or migration context. They no longer outrank canonical docs.

## New rule

Do not create one permanent `docs/*.md` per mission by default.

Permanent docs should represent durable decisions, stable architecture contracts, security/compliance invariants, reusable operational policies, or active roadmap/state.

Mission evidence belongs in PR/Git history or `data/audits/`.
