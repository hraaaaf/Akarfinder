# DATA-4.3E — First Bounded Freshness Write Canary

## Objective

Prepare and certify the first **real freshness mutation rehearsal** for Dar Agadir while keeping public behavior unchanged.

DATA-4.3D proved that `public_sitemap_presence` can be represented as typed, reversible freshness evidence. DATA-4.3E reduces the scope from 100 dry-run rows to a deterministic **10-row write canary**.

## PR behavior

The pull-request workflow is **DRY_RUN only**. It does not mutate production.

It must produce:

- `proof.json`;
- `apply-manifest.json` with exactly 10 rows;
- `rollback-manifest.json` with exactly 10 rows.

Each apply row contains:

- exact `before` state;
- proposed `fresh_confirmed` state;
- `public_sitemap_presence` channel;
- 14-day TTL evidence;
- same-origin sitemap provenance;
- embedded `data-4-3e-daragadir-v1` canary marker;
- exact rollback snapshot.

## Safety boundary

- Source Registry remains authoritative;
- current Registry boundary must remain public-sitemap/canonical-link only;
- live robots + same-origin public sitemap revalidation immediately precedes candidate selection;
- canary size fixed to 10;
- selection is deterministic;
- starting state must be `seed_only`;
- no detail-page fetch;
- no image/contact/description reuse;
- no display/publication policy mutation;
- no SERP activation;
- PR CI performs 0 DB/freshness writes.

## Production rehearsal after merge

A production write is allowed only after the PR head is fully green and its artifact has been inspected.

The rehearsal sequence is:

1. re-check Source Registry and current sitemap;
2. re-check the exact 10 rows still match the manifest `before` state;
3. apply only the four freshness/evidence fields plus `updated_at` to those exact rows;
4. verify exactly 10 rows now match the proposed state;
5. verify public/display policy is unchanged and no automatic public activation occurred;
6. perform an exact rollback using the embedded snapshot;
7. verify all 10 rows are byte-equivalent to their pre-write freshness/evidence state.

The rehearsal should end with **net zero freshness changes**. A persistent canary or wider rollout requires another explicit lot.

## Stop conditions

Fail closed and do not write if any of the following changes:

- Registry no longer permits `public_sitemap`;
- Registry review becomes expired/blocked;
- robots no longer declares an admissible current sitemap;
- a selected URL disappears from the sitemap;
- a selected row is no longer `seed_only`;
- rollback snapshot cannot be reconstructed exactly;
- any write would affect display/publication eligibility directly.

## Exit gate

DATA-4.3E succeeds only if the 10-row production rehearsal can be **applied, verified and fully rolled back** while public behavior remains unchanged.
