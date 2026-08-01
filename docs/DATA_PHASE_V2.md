# AKARFINDER — DATA PHASE V2

## Current blocker

The final ODM release gate is `BLOCKED_BY_DATA_DEPTH`.

Connected baseline:

- priority cities covered: 5/7;
- fully structured city + property type + intent: 3%;
- price coverage: 27%;
- surface coverage: 71%;
- ranked share: 3%.

## Execution order

1. Structured Field Recovery — property type and intent, fail-closed.
2. Structured Field Materialization — apply only certified candidates.
3. Price Coverage Recovery.
4. Tanger and Kenitra Coverage Recovery.
5. Quality Re-evaluation and Ranking Recovery.
6. Final Release Gate rerun.

## Invariants

- no bypass;
- no public activation from DATA work;
- explicit evidence and provenance;
- ambiguous values remain unknown;
- one responsibility per LOT and PR;
- Shadow, connected report, then materialization;
- rollback available.

## Active LOT

`ODM Structured Field Recovery V1` creates a service-role-only Shadow candidate table from title, snippet, query and canonical URL. Existing normalized fields are never overwritten. Multiple conflicting matches are retained as ambiguous and excluded from recovery.
