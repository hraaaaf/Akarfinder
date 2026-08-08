# DATA-4.3H — Controlled Expansion to 500

## Status

**COMPLETE — production final certification passed on 2026-08-08.**

Dar Agadir reached the mandatory controlled cap of **500 cumulative persistent freshness rows** with **0% Search/display drift**, unchanged Source Registry and no rollback required.

## Goal

Certify a controlled expansion path from the first **50 persistent Dar Agadir freshness rows** to the mandatory re-certification cap of **500 cumulative rows**.

## Expansion contract

Starting point: 50 persistent rows from DATA-4.3G.

Executed plan:

`50 + 100 + 100 + 100 + 100 + 50 = 500`

Rules preserved throughout:

- max **100 rows/run**;
- Registry + public sitemap revalidated before each run;
- only `seed_only` rows without `public_sitemap_presence` entered a batch;
- TTL remained **14 days**;
- drift cap remained **1%**;
- Search/display measured before and after every production batch;
- every batch had an exact before snapshot + rollback;
- partial apply, Registry drift, sitemap drift or unexpected public effect => fail closed;
- no detail-page fetch, content reuse or display/publication-policy change.

## Supporting corrections

- PR #372 — DATA-4.3H.1: certified starting count scoped by typed provenance so two legitimate pre-existing sitemap rows were not mistaken for the controlled cohort.
- PR #373 — DATA-4.3H.2: exact first +100 apply/rollback manifests.
- PR #375 — DATA-4.3H.3: certified continuation checkpoints `50 → 150 → 250 → 350 → 450 → 500`, fail-closed on partial/non-sequential state, batch-specific typed run IDs.

## Production execution

Controlled cohorts:

- DATA-4.3G baseline: **50** rows;
- `data-4-3h-daragadir-batch-1-v1`: **100** rows;
- `data-4-3h-daragadir-batch-2-v1`: **100** rows;
- `data-4-3h-daragadir-batch-3-v1`: **100** rows;
- `data-4-3h-daragadir-batch-4-v1`: **100** rows;
- `data-4-3h-daragadir-batch-5-v1`: **50** rows.

Every batch was preceded by a fresh public-sitemap dry-run and an exact production preflight. Writes were executed transactionally with cardinality assertions and post-write Search/display assertions. Intermittent `robots.txt` responses without a sitemap declaration were treated fail-closed; no old sitemap was hardcoded and no bypass was used.

## Final production certification

Dar Agadir after the final +50:

- total rows: **6,533** — unchanged;
- `fresh_confirmed`: **605**;
- `seed_only`: **5,928**;
- global `public_sitemap_presence`: **502**;
- controlled DATA-4.3G + DATA-4.3H rows: **500/500**;
- controlled rows `fresh_confirmed` + sitemap channel: **500/500**;
- Public Search: **500/500**;
- technical display: **500/500**;
- Search/display drift attributable to the writes: **0%**;
- rollback: **not required**.

The remaining two global sitemap-channel rows are legitimate pre-existing rows outside the controlled 500 cohort.

## Registry certification

Unchanged at final certification:

- `acquisition_mode = public_sitemap_canonical_link`;
- `discovery_policy = public_sitemap_only`;
- `display_policy = canonical_link_only`;
- `display_gate = external_tail_link_only`;
- `machine_gate = canonical_link_only`;
- `allowed_discovery_channels = [public_sitemap]`;
- `max_revalidation_interval_days = 14`;
- `review_status = due_soon`.

## Exit condition

**Satisfied.** DATA-4.3H stops at **500 controlled persistent rows**. No further promotion is authorized by this lot. Any expansion beyond 500 requires a separately defined and re-certified next DATA decision in `docs/ROADMAP.md`.
