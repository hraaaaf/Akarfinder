# ODM A5.1 — Reversible Activation Canary

## Scope

A5.1 activates exactly 200 canonical-link-only representations in public search:

- 100 from `daragadir.com`;
- 100 from `promoimmomarrakech.com`.

The selected rows are deterministic, freshness-qualified by A3, activation-ready by A4, and contain no source title, snippet, price or surface.

## Representation contract

The canary exposes only:

- the canonical source URL;
- normalized city;
- normalized property type;
- normalized intent;
- a generic AkarFinder-composed title.

It exposes no copied description, source title, imagery, price or surface.

## Activation model

A5.1 snapshots every field it changes before activation. The canary changes only the selected 200 search documents:

- `document_kind`: `AMBIGUOUS` → `LISTING`;
- generic title generated from normalized dimensions;
- raw city/type/intent populated from their normalized values;
- explicit A5.1 provenance in document-kind metadata.

All other A4 candidates remain unchanged.

## Rollback

`odm_rollback_a5_1_canary_v1()` restores the 200 selected rows from the snapshot. The function is idempotent when the canary is already inactive and fails closed if the active batch is incomplete.

## Required production checks

Before the canary may remain active:

1. exactly 200 rows become publicly eligible;
2. the split remains 100/100;
3. no copied title or snippet is exposed;
4. no price or surface is exposed;
5. public search returns the canary for relevant city/type/intent filters;
6. existing public inventory remains queryable;
7. pagination and total counts remain coherent;
8. rollback removes exactly 200 public representations;
9. reactivation reproduces the same deterministic batch.

## Safety

- service-role-only preparation, activation, rollback and reporting;
- no detail-page request;
- no source-content reuse;
- no imagery reuse;
- no activation beyond 200 rows;
- no source-policy expansion;
- rollback available at all times;
- canary volume is not certified permanent inventory.

## Promotion rule

A5.2 must not begin until A5.1 has passed production search checks and remained stable under review. A5.2 must use progressive batches rather than activating all 8,057 candidates at once.
