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
