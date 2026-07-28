# ODM-DIVERGENCE-ANALYZER-01

## Verdict

`ANALYZER_READY_NOT_YET_FED_BY_PRODUCTION_TELEMETRY`

## Scope

Convert `odm_dual_read_v1` events into deterministic per-query assessments and an aggregate stop/go summary for a future public canary.

## Classifications

- `legacy_better`
- `odm_better`
- `equivalent`
- `odm_regression`
- `human_review`

Primary causes are coverage, ranking, canonicalization, trusted price, trusted surface or insufficient evidence.

## Aggregate stop gate

A public canary remains blocked when:

- fewer than 200 shadow events are available;
- trusted-price divergence exceeds 2%;
- trusted-surface divergence exceeds 3%;
- ODM regression assessments exceed 1%.

## Boundary

This module is pure analysis. It does not change Search, ranking, display eligibility, source policy, environment variables or production traffic.
