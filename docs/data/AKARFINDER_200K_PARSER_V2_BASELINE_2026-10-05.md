# AkarFinder — 200K Fresh Listings / Parser V2 Baseline

Date: 2026-10-05

## Goal

Reach **>= 200,000 fresh, unique, exploitable listings**.

Minimum mandatory fields:
- canonical source URL
- city
- district
- price
- surface

Strict rule: a mandatory field is `parser_miss` only when source evidence proves the field exists and extraction missed it.

## Canonical raw material — verified

- GitHub artifact: `10910779576`
- file: `clean-corpus-v4.11-core.jsonl.gz`
- SHA-256: `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`
- rows: **226,286**
- unique canonical URLs: **226,286**
- KEEP: **225,952**
- scope eligible: **222,359**
- database access/write: **0/0**

The freeze is a **mixed schema**:
- every row carries URL / source / classification / scope / crawl evidence;
- the deep-observed subset can additionally carry business fields.

Verified optional enrichment:
- deep unique HTTP-200 URLs: **8,487**
- title: **8,487**
- description: **8,487**
- published_at: **8,487**
- city: **8,454**
- district: **6,296**
- price_mad: **3,770**
- surface_m2: **4,567**
- mandatory-complete rows (URL + city + district + price + surface): **1,191**

These enrichment counts are valid. However, absence of a field outside explicit source evidence does **not** prove a parser failure.

## Structured URL recovery evidence

Strict structured routes expose additional candidates:
- city: **61,547**
- district: **48,023**
- transaction_type: **60,761**
- property_type: **61,543**

State: `recoverable_from_url`, not automatically `parser_miss` and not automatically write-safe.

## Largest raw reservoirs

1. Mubawab: **82,796**
2. Sarout: **44,130**
3. MarocImmo: **37,299**
4. Avito: **24,532**
5. Domio: **10,347**
6. Agenz: **9,347**

## Mubawab — verified offline lot

Raw URL rows: **82,796**

Identity normalization:
- detail-route rows: **81,996**
- non-detail/search/navigation routes: **800**
- unique detail identities: **74,867**
  - individual `a:<id>`: **72,746**
  - project `pa:<id>`: **2,121**
- duplicate historical URL rows beyond unique detail identities: **7,129**
- raw overcount versus unique detail identities: **7,929 / 9.577%**
- scope-eligible deduplicated live-fetch plan: **74,486**

URL evidence across unique identities:
- transaction: 48,739 recoverable / 306 conflict / 25,822 unresolved
- property type: 63,013 recoverable / 4,532 conflict / 7,322 unresolved
- surface: 10,331 high / 10,160 review / 389 conflict / 53,987 unresolved
- free-slug city: review only

Regression tests: **6/6 PASS**.

## Parser V2 evidence states

- `verified`: corroborated source evidence
- `recoverable_from_url`: explicit structured URL evidence
- `parser_miss`: source field proven present but extractor failed
- `source_missing`: source evidence proves field absent
- `conflict`: credible evidence disagrees
- `invalid`: extracted value violates contract
- `review`: insufficient certainty
- `unresolved`: no sufficient evidence yet

## Freshness

The freeze is discovery material, not proof of current activity. Freshness must be re-established source-side.

To reach 200,000 from the 222,359 eligible frozen URLs alone would require **89.94%** to survive as fresh + mandatory-complete; this is not yet proven.

## Safety / execution

- freeze-first
- no Neon query for reproducible work
- no DB write
- no Vercel deployment
- bounded public-source benchmarks only
- PR #1105 is closed because opening it unintentionally queued a separate Neon preflight workflow

## Implementation

Branch: `data/200k-fresh-parser-v2`

Global:
- `scripts/data/audit-github-freeze-parser-readiness-v2.mjs`
- `.github/workflows/github-freeze-parser-readiness-v2.yml`

Mubawab:
- `scripts/data/mubawab-url-parser-v2.mjs`
- `scripts/data/__tests__/mubawab-url-parser-v2.test.mjs`
- `scripts/data/mubawab-freeze-adapter-v2.mjs`
- `scripts/data/mubawab-live-benchmark-v2.mjs`
- `.github/workflows/mubawab-parser-v2-benchmark.yml`

## Next exact

Read the push-only 100-identity Mubawab benchmark when available. In parallel continue source-specific offline identity normalization for Sarout.