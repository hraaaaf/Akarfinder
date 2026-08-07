# DATA-4.3F — Controlled Promotion Design

## Goal

Turn the successful DATA-4.3E 10-row rehearsal into a **bounded promotion design**, not a bulk activation.

No database write or public activation is performed by this lot.

## Certified input

DATA-4.3E proved:

- 10/10 production apply;
- 10/10 exact freshness-state verification;
- 10/10 rollback;
- post-rollback state restored to `seed_only`, `fresh_last_seen_at=NULL`, `fresh_channels=[]`, original metadata;
- the 10 URLs remained in `public_search_representations_v1` after rollback, so their representation was not caused by the freshness write;
- `updated_at` changed and was not part of the original rollback snapshot.

## Promotion contract

- first persistent batch: **50 rows**;
- hard maximum per run: **100 rows**;
- cumulative maximum before mandatory re-certification: **500 rows**;
- maximum tolerated candidate drift: **1%**;
- channel: `public_sitemap_presence`;
- TTL: **14 days**;
- Registry, robots/sitemap signal and preconditions must remain valid;
- never promote the 5,564-row pool in one operation.

## Rollback semantics

Rollback must restore:

- `freshness_status`;
- `fresh_last_seen_at`;
- `fresh_channels`;
- metadata/evidence.

`updated_at` is captured in the before snapshot but is intentionally **not restored**. It is treated as an audit trail (`AUDIT_TRAIL_NON_ROLLBACKABLE`).

## Fail-closed conditions

Promotion stops if:

- Registry is no longer eligible;
- Registry review is expired/overdue/blocked;
- sitemap signal is missing;
- drift exceeds 1%;
- requested batch exceeds 100;
- 500 cumulative promoted rows are reached before re-certification.

## CI proof

The PR gate must prove:

- DATA-4.3F contract tests pass;
- DATA-4.3E and canonical seed-freshness regressions pass;
- TypeScript and production build pass;
- live production state is read-only;
- no residual `public_sitemap_presence` channel remains from the 4.3E rehearsal;
- Registry remains eligible;
- proposed first batch remains 50;
- 0 database writes, 0 freshness writes, 0 policy changes, 0 public activation.

## Exit condition

A successful DATA-4.3F only authorizes planning of a **separate first persistent batch**. It does not itself activate or persist any of the 5,564 candidate rows.
