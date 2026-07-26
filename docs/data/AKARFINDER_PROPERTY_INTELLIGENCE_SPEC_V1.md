# AkarFinder Property Intelligence V1

## Status

Foundation, Supabase readiness and first controlled production backfill completed.

## Production state — 2026-07-26

Canonical Supabase project: `kusfiyimwvxblvsrhaes`.

### Applied database controls

- atomic `persist_property_intelligence_feature(...)` RPC;
- `SECURITY INVOKER`;
- execution restricted to `service_role`;
- active-version uniqueness index per canonical property and feature;
- internal table/view grants revoked from `anon` and `authenticated`;
- no public activation.

### Canonical corpus audit

At execution time:

- 1,995 canonical clusters linked to listings;
- schema-default `false` values detected for `has_pool` and `has_concierge` on the full corpus;
- those defaults are not treated as observed negative evidence;
- adapter hardened to preserve `unknown` unless an explicit positive structured value exists.

### Controlled condition backfill

Snapshot: `property_intelligence_backfill_2026_07_26_v1`.

- 77 canonical properties received `condition.segment`;
- 77 active versions;
- 0 publication-eligible rows;
- 10 preliminary micro-snapshot versions were correctly superseded;
- 0 duplicate active version.

Active segment distribution:

- `good_condition`: 27;
- `recent`: 15;
- `renovated_old`: 13;
- `old_unspecified`: 10;
- `new_delivered`: 7;
- `needs_renovation`: 3;
- `needs_refresh`: 2.

All active rows are currently `rule_engine_v2` inferred outputs. They remain internal and must not be exposed until publication eligibility is separately certified.

## Invariants

- a listing remains an observation;
- source values are never overwritten;
- `unknown` and `conflicted` remain valid outputs;
- provenance, confidence, method, methodology version and input snapshot are retained;
- no automatic public activation;
- AQI remains internal;
- publication requires freshness, confidence, an approved method, displayable evidence and an explicit publication gate.

## Backfill execution contract

- paginated and cursor-resumable;
- dry-run by default;
- strict `maxRows` and validated batch size;
- unknown outputs skipped by default;
- persistence through the atomic RPC only;
- schema-default negative booleans are not accepted as evidence;
- public eligibility is always false during controlled backfill.

## Validation

- Property Intelligence tests: green;
- Supabase adapter regression tests: green;
- TypeScript: green;
- production build: green;
- connected RPC smoke test: green;
- idempotence and supersession: verified;
- security advisor: no new blocking issue attributable to this layer.
