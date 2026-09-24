# AkarFinder Recovery — Offline 200K Mass Harvest — 2026-09-24

## Goal

Build an offline candidate reservoir large enough to target 200,000 clean, unique Moroccan real-estate listings without writing to Neon or production during discovery.

## Capacity target

Because structural, freshness and duplicate filters will remove a material share of raw candidates, the acquisition target is:

- gross candidates: 300,000–400,000
- target after canonical URL dedupe: >= 250,000
- target after source/pattern/freshness/quality filtering: >= 200,000
- DB writes during discovery: 0

The survival rate is not assumed; it must be measured from artifacts.

## Capacity evidence rule

Public portal counts are orientation only, never inventory proof. Capacity is measured from generated artifacts. The 200k target is accepted only if the offline funnel itself proves >=200,000 unique post-filter candidates.

## Acquisition lanes

### Lane A — Common Crawl deep shadow

Metadata-only CDX index harvesting:
- no WARC
- no source-page fetch
- no DB access
- no DB writes
- strict registry listing URL patterns
- canonical URL dedupe
- per-domain counts + artifact hash

Recovery expansion:
- 21 official Common Crawl indexes across 2025–2026
- 9 indexes from 2026: 39, 34, 30, 25, 21, 17, 12, 08, 04
- 12 indexes from 2025: 51, 47, 43, 38, 33, 30, 26, 21, 18, 13, 08, 05
- high-volume recovery-only patterns for marocannonces.com and sarout.ma are injected at runtime from a dedicated overlay; the canonical production registry is unchanged

### Lane B — robots-declared public sitemaps

Only:
1. fetch robots.txt;
2. follow sitemap URLs explicitly declared there;
3. keep only direct listing URLs matching approved registry patterns.

If robots is unavailable, blocks all, or no sitemap is declared, the lane fails closed for that domain.

No listing page fetch is required for seed discovery.

### Lane C — Search API / Serper shadow

Use the existing 1,900-query mass plan only as an offline observation generator:
- retain title/snippet/url/rank/query provenance;
- no Supabase/Neon preload;
- no DB writes;
- use primarily for fresh re-observation and detail-vs-category classification.

A separate shadow runner is required before execution because the historical runner reads/writes Supabase.

### Lane D — targeted fresh detail verification

Only after structural candidate dedupe:
- sample or batch-reobserve high-value candidates;
- parse price/surface/location/type/transaction;
- contradictions -> quarantine;
- no candidate becomes approved_for_import solely from a historical URL.

## High-volume registry additions

### marocannonces.com

Verified direct-detail shape:
`/categorie/<categoryId>/<type>/annonce/<numericId>/<slug>.html`

Category/search pages stay blocked.

### sarout.ma

Verified direct-detail shape:
`/{fr|ar}/annonce/<numericId>/<slug>`

Collection routes stay blocked.

## Clean-listing funnel

`raw_url`
→ canonicalization
→ approved domain
→ direct listing pattern
→ historical/current provenance
→ canonical URL dedupe
→ basic field evidence
→ freshness/re-observation gate
→ property fingerprint dedupe
→ quarantine contradictions
→ candidate_pass
→ final reviewed artifact
→ only then possible approved_for_import

## Hard invariants

- production writes: 0
- Neon writes: 0
- Supabase writes: 0
- no Vercel deployment
- no direct source listing-page scraping in mass lanes; sitemap lane is limited to robots.txt plus same-domain sitemap URLs explicitly declared there
- no robots bypass
- no seed-only URL becomes a public listing

## Offline merge gate

The three discovery lanes are merged only into an offline JSONL reservoir:
- exact canonical URL dedupe;
- canonical registry + recovery-overlay pattern revalidation;
- exact exclusion of the previously restored 177 OpenSERP URLs;
- evidence channel aggregation.

Recovery statuses:
- `historical_only`: Common Crawl only;
- `current_url_only`: current robots-declared sitemap observation only;
- `search_observed`: accepted current search-API observation only;
- `reobserved`: at least two independent discovery channels.

None of these statuses equals `approved_for_import`. The merge summary hard-codes `approved_for_import_rows: 0`.

## Free funnel benchmark

A single canonical benchmark workflow now combines the free lanes:
1. 21-index Common Crawl metadata harvest;
2. robots-declared sitemap harvest;
3. exact canonical merge/dedupe;
4. exclusion of the restored 177 manifest;
5. evidence-status summary;
6. one artifact, zero DB writes.

The component Common Crawl and sitemap workflows are manual-only on this recovery branch to avoid duplicate heavy PR runs.

### First measured sitemap capacity

Run 36059028153 / artifact 10833423663 proved:
- 58,236 unique qualified listing URLs;
- 0 DB access/write;
- 0 listing-page fetches;
- sarout.ma: 44,130;
- daragadir.com: 5,749;
- promoimmomarrakech.com: 3,181;
- marrakechrealty.com: 2,008;
- limmobiliersansfrontieres.com: 1,365;
- atlasimmobilier.com: 728;
- barnes-marrakech.com: 568;
- aykana.ma: 507.

This is discovery capacity, not yet 58,236 approved listings.

## Source-aware identity audit

The first sitemap artifact proved why URL-count targets are unsafe:
- raw qualified URLs: 58,236;
- `sarout.ma`: 44,130 URLs but exactly 22,065 numeric listing IDs (FR + AR aliases);
- source-aware identity rules therefore collapse locale/route aliases before counting toward the 200k target;
- explicit short-stay/vacation routes are rejected at the offline merge gate.

A local audit of artifact 10833423663 produced ~33,750 source-identity candidates after source-aware alias collapse and explicit short-stay route rejection. This is a structural estimate from the artifact, not yet a freshness-approved inventory.
