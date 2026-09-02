# AKARFINDER — Morocco Web L8 Scale + Coverage Certification

Status: ACTIVE.

## Goal

Build **more than 100,000 usable Moroccan real-estate listings** by enumerating the public inventory of productive real-estate sources directly, then validating freshness, canonical extraction, deduplication, quality and serve admission.

Raw discovery URL volume is not a success metric.

## Starting production baseline — 2026-09-02

Supabase project: `AqarFinder` / `kusfiyimwvxblvsrhaes`.

Verified `public.discovery_candidates` counts:
- total rows: **304,933**;
- `rejected`: **142,143**;
- `unclassified`: **137,868**;
- `accepted`: **13,757**;
- `discovered`: **11,165**.

The raw 10k/50k/100k/250k candidate thresholds are already exceeded. They do **not** certify usable inventory.

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

## L8 success gates

A scale gate passes only through these layers:

1. **Source-first enumeration** — public listing-detail URLs from productive portals/agencies.
2. **Listing-detail validity** — real property listing rather than search/category/social/help content.
3. **Active/fresh** — page remains active under L6 semantics.
4. **Canonical extraction** — minimum property facts have source evidence.
5. **Deduplication** — same property/listing is collapsed without provenance loss.
6. **Listing Factory quality** — completeness/trust/media passport is computed where observable.
7. **Serve admission** — only validated canonical records are eligible for search.

## Scale gates

Certification sequence:
- Gate A: **10k usable canonical listings**;
- Gate B: **50k**;
- Gate C: **100k**;
- Gate D: **250k**;
- Gate E: **500k**, only if public Moroccan inventory supports it.

Each gate requires observed counts by source, geography, property type, transaction type, freshness, rejection reason, dedupe prevalence and quality distribution.

## Supporting corpus-triage result — CLOSED as critical path

The conservative L8 triage of the 137,868 `unclassified` rows produced:
- **5,536** URL-level listing-detail candidates;
- **44,749** discovery/category pages;
- **7,420** obvious noise / non-Moroccan URLs;
- **80,163** uncertain URLs.

PR #987 was squash-merged as `dc2aabcf308d4a19e71a43e9f414bde6123dfdf3`.

This triage remains useful for corpus cleanup but is **not the path to >100k inventory**.

## Critical-path pivot — source-first exhaustive enumeration

The correct acquisition direction is now:

`productive source → public shard manifest → listing IDs/URLs → active validation → extraction → dedupe → quality → serving`

rather than:

`heterogeneous web URLs → classify → hope they become listings`.

### Mubawab public-inventory facts — 2026-09-02 snapshot

Mubawab publicly presents a homepage inventory around **105k “biens immobiliers”**, but this number must not be treated as proof of 105k unique classic listing-detail URLs.

Observed public category counters are materially lower for classic inventory, roughly:
- sale: **~25.4k**;
- long-term rent: **~22.8k**;
- vacation: **~1.2k**;
- new-build inventory is presented separately as projects.

Therefore the >100k AkarFinder target is expected to require **Mubawab plus other independent Moroccan sources**, not a fabricated assumption that one portal exposes >100k unique detail URLs.

### Robots constraint

Current Mubawab `robots.txt` disallows paths containing `:`. The former L2 adapter generated legacy `:p:N` pagination URLs; L8 removes that behavior and the new enumerator rejects colon paths by construction.

No CAPTCHA bypass, private API, proxy evasion or blocked-path workaround is permitted.

## Mubawab exhaustive-enumeration evidence

### Root probe

Dedicated run `33661387757` — SUCCESS:
- 3 public root requests;
- **96** unique Mubawab listing URLs;
- no HTTP 429;
- zero DB writes;
- no child shard links available in the static root HTML.

Conclusion: root-page recursion alone cannot enumerate the catalogue.

### Existing production shard manifest

Read-only production analysis found the existing Mubawab corpus already contains thousands of public shard rows across `cc`, `ct`, `cd` and `sd` URL families.

Row-level counts observed before URL deduplication:
- `cc`: **13**;
- `ct`: **816**;
- `cd`: **1,127**;
- `sd`: **4,308**;
- existing detail rows: **1,840**.

The Supabase-backed runner subsequently deduplicated the full Mubawab source slice and measured:
- source rows read: **14,750**;
- unique robots-safe shard URLs: **3,172**.

The difference from the row-level 6,264 shard count is duplicate shard identities in the discovery corpus; **3,172** is the relevant unique manifest size.

### First connected shard replay

Dedicated run `33662143708` — SUCCESS on `663ad4257e02ce81469f07b0d84429ab45687e56`:
- Supabase read path only;
- 25 deepest known public shards selected;
- 25 HTTP requests;
- **615** listing references observed across shard pages;
- **301** unique Mubawab listing IDs/URLs after dedupe;
- 22/25 shards produced at least one listing;
- no HTTP 429;
- zero DB writes.

Artifact: `9859120073`.
Digest: `sha256:d3ddad5cc70a86db3eeda5ddb4bd2ce8e28f67d9914bb2c6817068d9759c32ee`.

This is a productive acquisition path. It also shows substantial cross-shard overlap (~51% of observed references in this first sample), so scale must be certified on **unique IDs**, never summed page-card counts.

### Supabase query hardening

The first connected attempt `33661656687` failed because an ordered REST manifest query timed out with HTTP 500.

Production EXPLAIN evidence:
- ordered `canonical_url` read of 1,000 Mubawab rows: **~99.8 s**;
- unordered source-indexed read of 1,000 Mubawab rows: **~0.53 s**.

The runner now filters by indexed `source_domain`, paginates without `ORDER BY`, then deduplicates/sorts the ~15k source rows in memory.

## Critical path to >100k

1. Certify Mubawab manifest replay in bounded gates: **25 → 100 → 500 → full safe manifest**, stopping immediately on 429.
2. Union listing URLs by Mubawab listing ID and measure marginal unique yield / overlap at every gate.
3. Validate active/fresh and canonical-extractable rate on representative batches before mass promotion.
4. Repeat the same **source-first exhaustive** strategy for the largest independent sources, prioritizing Avito, Sarouty, MarocAnnonces and Agenz where public access is compliant.
5. Union sources and cross-source dedupe.
6. Certify **10k → 50k → 100k usable canonical listings**.
7. Only then consider 250k/500k if public market evidence supports it.

## Safety / production gates

- Current enumeration work is read-only against Supabase and public source pages.
- No L8 bulk status mutation is authorized by this document.
- Any bulk production mutation requires a separately bounded, auditable canary and rollback evidence.
- No Vercel deployment is required for this acquisition lot.

## Next exact

Finish certification/merge of `feat/mubawab-exhaustive-enumerator`, then run the **100-shard Mubawab unique-yield gate** with the same robots/429/zero-write contract before increasing to 500.
