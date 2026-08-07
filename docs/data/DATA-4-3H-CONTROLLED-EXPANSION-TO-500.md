# DATA-4.3H — Controlled Expansion to 500

## Goal

Certify a controlled expansion path from the first **50 persistent Dar Agadir freshness rows** to the mandatory re-certification cap of **500 cumulative rows**.

The PR remains DRY_RUN only.

## Expansion contract

Starting point: 50 persistent rows from DATA-4.3G.

Target plan:

`50 + 100 + 100 + 100 + 100 + 50 = 500`

Rules:

- max **100 rows/run**;
- Registry + public sitemap revalidated before each run;
- only `seed_only` rows without `public_sitemap_presence` may enter;
- TTL remains **14 days**;
- drift cap remains **1%**;
- Search/display are measured before and after each production batch;
- every batch has snapshot + rollback;
- partial apply, Registry drift, sitemap drift or unexpected public effect => fail closed and rollback;
- no detail-page fetch, content reuse or display/publication-policy change.

## CI proof

The live audit must prove:

- current persistent rows = **50**;
- enough current sitemap-backed candidates exist to reach 500;
- planned batches = **[100,100,100,100,50]**;
- next batch = **100**;
- exact first/last URL of that next batch;
- public Search + technical display counts before mutation;
- zero writes and zero activation in CI.

## Exit condition

DATA-4.3H is complete only after controlled production runs reach **500 cumulative persistent freshness rows** with drift <=1%, unchanged Registry/display policy and successful post-write verification. At 500, expansion must stop for re-certification before any further promotion.
