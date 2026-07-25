# ODM-02 — Freshness Engine V2

Status: COMPLETE

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

## Execution completed

1. Re-measured the canonical Search/Thin Index after the current free-lane observations.
2. Reconciled all already-accepted OpenSERP/Serper evidence by canonical URL.
3. Confirmed that no remaining `seed_only` row has already-accepted discovery evidence waiting for promotion (`promotable_seed_only = 0`).
4. Preserved current public-sitemap and Common Crawl provenance; no historical row was upgraded from ingestion time alone.
5. Added a reusable read-only completion and publication-safety certification query.
6. Did not consume paid credits, contact blocked source surfaces, change Vercel configuration or deploy Production.

## Verified completion state — 2026-07-25

- distinct eligible Search/Thin Index representations: **55,933**
- `fresh_confirmed`: **2,199**
- `seed_only`: **53,734**
- latest Thin Index projection: `2026-07-25 14:20:12.411+00`
- provider mix:
  - Common Crawl CDX: **42,543**
  - public sitemap: **11,431**
  - approved Serper: **1,959**
- duplicate canonical URLs: **0**
- unexpected provider rows: **0**
- Serper rows without accepted discovery evidence: **0**
- accepted discovery rows still awaiting freshness promotion: **0**

Net movement versus baseline:

- searchable representations: **+8**
- `fresh_confirmed`: **+2**
- no unsafe publication introduced

The small but measurable increase is the verified yield of the already-authorized free/current evidence available during ODM-02. The much larger historical Common Crawl reservoir remains correctly classified as `seed_only`; ODM-02 does not manufacture freshness where current publication evidence is absent.

## Completion gate

- freshness reconciliation is idempotent: PASS
- no provenance loss: PASS
- no rejected/unclassified publication through Serper: PASS
- no unexpected provider in Thin Index: PASS
- no duplicate canonical URL: PASS
- measurable increase or documented free-lane exhaustion: PASS
- no Production deployment or Vercel configuration change: PASS

ODM-02 is complete. The next roadmap mission is ODM-03: deterministic Price / Surface / Geo Recovery.
