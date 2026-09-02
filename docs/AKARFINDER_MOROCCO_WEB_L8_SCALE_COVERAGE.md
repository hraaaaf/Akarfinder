# AKARFINDER — Morocco Web L8 Scale + Coverage Certification

Status: ACTIVE.

## Goal

Build **more than 100,000 usable Moroccan real-estate listings** by enumerating public inventory source-first, then validating freshness, canonical extraction, deduplication, quality and serve admission.

Raw discovery URL volume is not a success metric.

## Starting production baseline — 2026-09-02

Supabase project: `AqarFinder` / `kusfiyimwvxblvsrhaes`.

Verified `public.discovery_candidates` counts:
- total rows: **304,933**;
- `rejected`: **142,143**;
- `unclassified`: **137,868**;
- `accepted`: **13,757**;
- `discovered`: **11,165**.

These raw counts do **not** certify usable inventory.

## Certified entry condition from L7

First production canary is certified:
- before snapshot: 0/3;
- inserted: 3;
- duplicates: 0;
- failures: 0;
- after snapshot: 3/3;
- exact DB delta: +3;
- target remained `discovery_candidates` only;
- no canonical listing publication;
- no Vercel deployment.

Canonical evidence: `docs/AKARFINDER_MOROCCO_WEB_L7_CANARY_HARDENING.md`.

## L8 usable-inventory contract

A gate passes through:
1. source-first public enumeration;
2. listing-detail validity;
3. active/fresh validation under L6;
4. canonical extraction with source evidence;
5. cross-source deduplication;
6. Listing Factory quality passport where observable;
7. serve admission only for validated canonical records.

Scale gates: **10k → 50k → 100k → 250k → 500k** usable canonical listings, with 250k/500k only if public-market evidence supports them.

## Supporting corpus triage — CLOSED as critical path

The conservative triage of 137,868 `unclassified` rows produced:
- **5,536** listing-detail candidates;
- **44,749** discovery/category pages;
- **7,420** obvious noise / non-Moroccan URLs;
- **80,163** uncertain URLs.

PR #987 merged as `dc2aabcf308d4a19e71a43e9f414bde6123dfdf3`.

Useful for cleanup, but not the path to >100k.

## Critical-path pivot — source-first enumeration

`productive source → public shard/sitemap manifest → listing IDs/URLs → active validation → extraction → dedupe → quality → serving`

No CAPTCHA bypass, private API, proxy evasion or blocked-path workaround is permitted.

# Source 1 — Mubawab

## Public-inventory interpretation

Mubawab publicly presents a homepage inventory around **105k “biens immobiliers”**, but this is not proof of 105k unique classic listing-detail URLs. Public category counters are materially lower for classic sale/rent inventory, so the >100k AkarFinder goal is explicitly **multi-source**.

## Robots constraint

Current Mubawab `robots.txt` disallows paths containing `:`. Legacy `:p:N` pagination has been removed from the acquisition adapter; the new enumerator rejects colon paths by construction.

## Enumerator implementation

PR #988 merged to main as signed commit:
`c7306784653339ab942a69403cfaca9a39688973`.

The merged path:
- reads existing public Mubawab shard URLs from Supabase without writes;
- filters by indexed `source_domain`;
- deduplicates shards in memory;
- fetches only robots-safe public pages;
- deduplicates listing URLs by Mubawab listing ID;
- stops immediately on HTTP 429.

## Root probe

Run `33661387757` — SUCCESS:
- 3 public root requests;
- **96** unique listing URLs;
- no 429;
- zero DB writes.

Root HTML did not expose enough child shards, so root recursion alone is insufficient.

## Production shard manifest

Read-only source slice:
- source rows: **14,750**;
- unique robots-safe public shard URLs: **3,172**.

Earlier row-family counts before URL deduplication were `cc` 13, `ct` 816, `cd` 1,127, `sd` 4,308. Their larger sum reflects duplicate shard identities already present in discovery data.

## Gate 25

Run `33662143708` — SUCCESS:
- 25 shards;
- 615 listing references;
- **301 unique listing IDs**;
- 22/25 productive;
- no 429;
- zero DB writes.

Artifact `9859120073`.
Digest `sha256:d3ddad5cc70a86db3eeda5ddb4bd2ce8e28f67d9914bb2c6817068d9759c32ee`.

## Gate 100

Run `33662906605` — SUCCESS:
- **100 shards**;
- **2,149 listing references**;
- **663 unique listing IDs**;
- 89/100 productive;
- no 429;
- zero DB writes.

Artifact `9859428604`.
Digest `sha256:8e6e811d013e39b9fbe3888377b006c52a7a470c0dbdaa1b0fe37f21983aa4a1`.

This gate showed substantial cross-shard overlap; summed cards are not a scale metric.

## Gate 500

Run `33663293707` — SUCCESS:
- **500 public shards**;
- **5,195 unique listing IDs**;
- no HTTP 429;
- zero DB writes.

Artifact `9859737496`.
Digest `sha256:1143ee31bf3f834c7d401e2db6f6c1a4290767ddf460e53961c05400c0272512`.

Observed unique yield is **10.39 listing IDs/shard** at this gate. Mubawab remains productive enough to continue, but it is not assumed to deliver 100k alone.

## Supabase read-path hardening

First connected attempt `33661656687` failed because an ordered REST manifest query timed out with HTTP 500.

Production EXPLAIN evidence:
- ordered `canonical_url` read of 1,000 Mubawab rows: ~**99.8 s**;
- unordered source-indexed read of 1,000 rows: ~**0.53 s**.

The runner therefore filters on indexed `source_domain`, pages without `ORDER BY`, then deduplicates/sorts the source slice in memory.

# Source 2 — Avito

## Existing production footprint

Read-only production measurements before new enumeration:
- **11,907** Avito rows;
- **5,960** unique Avito URLs;
- approximately **1,280** known detail-like URLs under the current URL heuristic;
- approximately **4,680** non-detail/discovery URLs available as a fallback shard pool.

Observed public shard families include `/fr/.../immobilier` and `/sp/immobilier/...`.

## Robots + sitemap verdict

Current public `robots.txt` declares:
`https://www.avito.ma/sitemap.xml`.

Run `33665119348` — SUCCESS as a bounded safety probe:
- robots.txt: accessible;
- declared sitemap root discovered: 1;
- sitemap request: **HTTP 403** from GitHub runner;
- real-estate listing URLs from sitemap: **0**;
- no 429;
- zero DB writes.

Artifact `9860235754`.
Digest `sha256:af8c33120c060df5ebd738cb86e8dd59f0b92115a85f7b27acc94a3c29ac4364`.

Conclusion: **do not attempt to bypass the sitemap 403**. Avito continues through existing public discovery shards instead.

## Avito shard fallback contract

`feat/avito-sitemap-enumerator` now contains a read-only Supabase shard runner that:
- reads only `source_domain = avito.ma`;
- retains public immobilier discovery pages, not detail rows;
- bounds live replay to 25 shards for certification;
- extracts public `.htm` listing URLs;
- filters observed FR/AR real-estate category segments;
- deduplicates by Avito listing ID;
- stops immediately on HTTP 429;
- performs zero DB writes.

## Critical path to >100k

1. Certify Avito 25-shard fallback and measure marginal unique yield.
2. Continue Mubawab beyond 500 only through bounded gates while unique yield remains productive.
3. Scale Avito through the same bounded unique-ID gates if its 25-shard yield is productive.
4. Repeat source-first enumeration for Sarouty, MarocAnnonces and Agenz.
5. Union source listing IDs/URLs, validate active/fresh + canonical extractability, then cross-source dedupe.
6. Certify **10k → 50k → 100k usable canonical listings**.

## Safety / production gates

- Current L8 enumeration is read-only against Supabase and public source pages.
- No L8 bulk status mutation is authorized by this document.
- Any bulk production mutation requires a separately bounded, auditable canary and rollback proof.
- No Vercel deployment is required.

## Next exact

Finish Avito shard-fallback certification on the exact final branch HEAD, measure **25-shard unique yield**, then choose the next bounded Avito/Mubawab scale gate based on observed marginal unique yield rather than raw page-card counts.
