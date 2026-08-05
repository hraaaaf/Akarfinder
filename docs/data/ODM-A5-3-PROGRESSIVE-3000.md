# ODM A5.3 — Progressive Activation to 3,000

## Scope

A5.3 adds exactly 2,000 reversible canonical-link-only representations to the 1,000 already active through A5.1 and A5.2.

Target public depth after activation: **10,483**.

## Batch contract

- 1,000 rows from `daragadir.com`;
- 1,000 rows from `promoimmomarrakech.com`;
- A3 freshness-qualified;
- A4 activation-ready;
- excludes every A5.1 and A5.2 seed;
- deterministic selection;
- no source title or snippet;
- no price, surface, description or imagery;
- no detail-page fetch.

## Activation safety

The batch is snapshotted before activation. Activation must produce an exact public-depth delta of **+2,000**. Rollback must restore exactly **2,000** rows and produce an exact delta of **−2,000**.

Every control function is restricted to `service_role`. The source evidence remains canonical-link-only.

## Required production proof

1. Prepare exactly 2,000 rows split 1,000/1,000.
2. Activate and verify the public count moves from 8,483 to 10,483.
3. Confirm snippets, price and surface exposure remain zero.
4. Roll back and verify return to 8,483.
5. Reprepare and reactivate the same deterministic tranche.
6. Merge only after all GitHub workflows are green.

## Stop condition

No expansion beyond 3,000 active recovery representations is allowed in this LOT. The remaining A3/A4 reserve requires a separate A5.4 review.
