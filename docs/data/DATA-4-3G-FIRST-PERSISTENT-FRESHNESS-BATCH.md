# DATA-4.3G — First Persistent Freshness Batch

## Goal

Prepare and certify the first **persistent** Dar Agadir sitemap-presence freshness batch, capped at **50 rows**.

The PR itself remains DRY_RUN only. A production write may happen only after full green certification and merge.

## Contract

- deterministic batch size: **50**;
- source channel: `public_sitemap_presence`;
- TTL: **14 days**;
- input rows must be `seed_only` and must not already carry the sitemap channel;
- Registry and sitemap are revalidated immediately before selection;
- all 50 rows include a complete before snapshot;
- `updated_at` is captured as audit trail and is not restored by rollback;
- rollback is prepared for all 50 rows;
- no detail-page fetch, content reuse, policy change or publication-policy change.

## Pre-write observability

The dry-run must capture before the write:

- how many of the 50 URLs already exist in `public_search_representations_v1`;
- how many are already technically displayable;
- exact seed state for every selected row;
- current Registry review status and TTL;
- source request count.

This prevents attribution errors like the one intentionally resolved during DATA-4.3E.

## Production sequence after merge

1. re-run preflight against the exact 50 URLs;
2. capture public-search count before mutation;
3. apply freshness/evidence only to rows matching exact preconditions;
4. require **50/50 applied** or stop;
5. verify exact proposed state for all 50;
6. measure public-search/display counts after mutation;
7. if any drift, partial apply or unexpected public-policy effect occurs, execute rollback;
8. if certification is clean, leave the 50-row freshness batch persistent;
9. never change Source Registry or display/publication policy in this lot.

## Exit condition

A successful DATA-4.3G proves a **single persistent batch of 50** can be safely maintained. It does not authorize the remaining pool or a bulk 5,564-row promotion.
