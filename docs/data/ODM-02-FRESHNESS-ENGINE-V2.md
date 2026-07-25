# ODM-02 — Freshness Engine V2

Status: IN PROGRESS

Scope: improve freshness coverage of canonical Search/Thin Index representations using only policy-compliant, source-preserving evidence. No Production deployment, no Vercel configuration change, no provider-gate bypass, no blind paid-credit use.

## Verified starting state — 2026-07-25

- GitHub `main` HEAD: `50bc4c2d9c414268f80fdd1ccd30cf826b853280`
- distinct Thin Index/Search representations: 55,925
- duplicate canonical URLs: 0
- `fresh_confirmed`: 2,197
- `seed_only`: 53,728
- provider mix: Common Crawl CDX 42,543; public sitemap 11,423; approved Serper 1,959

## Priority matrix

Highest free recovery reservoirs at baseline:

| Source/provider | Seed only | Fresh confirmed |
|---|---:|---:|
| avito.ma / commoncrawl_cdx | 23,924 | 1 |
| mubawab.ma / commoncrawl_cdx | 10,287 | 11 |
| daragadir.com / public_sitemap | 5,725 | 24 |
| agenz.ma / commoncrawl_cdx | 3,270 | 48 |
| promoimmomarrakech.com / public_sitemap | 2,933 | 2 |
| limmobiliersansfrontieres.com / public_sitemap | 1,177 | 22 |
| masaken.ma / commoncrawl_cdx | 1,149 | 60 |
| mouldar.com / commoncrawl_cdx | 1,098 | 3 |

## Freshness evidence hierarchy

1. Current approved public sitemap observation with a valid listing URL.
2. Current approved OpenSERP/Serper observation already accepted by discovery gates.
3. Recent Common Crawl index observation for an approved source and strict listing pattern.
4. Historical Common Crawl evidence remains `seed_only` unless corroborated by a current approved lane.

A record is never marked fresh because of ingestion time alone.

## Deterministic reconciliation rules

- Match on canonical URL only.
- Preserve `source_domain`, `seed_provider`, first/last observation timestamps and channel provenance.
- Promote `seed_only` to `fresh_confirmed` only with a current accepted observation.
- Never demote or delete solely because a source is temporarily absent from one observation cycle.
- Never treat HTTP uncertainty, search snippets or inferred dates as proof of current publication.
- Never publish rejected or unclassified discovery rows.
- Keep provider publication gates authoritative.

## Execution order

1. Reconcile current public-sitemap observations for approved sources.
2. Reconcile already-approved OpenSERP/Serper observations without spending new credits.
3. Query only the newest free Common Crawl index for high-yield approved domains not recently harvested.
4. Stop low-yield lanes and record yield per request/index/domain.
5. Rebuild Thin Index only through the existing canonical trigger/publication path.
6. Re-measure distinct searchable representations, freshness mix and unsafe publication count.

## ODM-02 completion gate

- freshness reconciliation is idempotent;
- no provenance loss;
- no rejected/unclassified publication;
- no unexpected provider in Thin Index;
- no duplicate canonical URL;
- measurable increase in `fresh_confirmed`, or a documented zero-yield result proving the free reservoirs are exhausted;
- no Production deployment and no Vercel configuration change.

The companion read-only SQL is stored in `scripts/data/odm_02_freshness_priority.sql`.
