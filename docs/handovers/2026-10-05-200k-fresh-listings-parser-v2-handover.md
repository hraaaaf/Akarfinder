# AkarFinder — 200K Fresh Listings / Parser V2 Handover

Date: 2026-10-05

## Goal

>= **200,000 fresh, unique, exploitable listings**.

Mandatory fields:

- canonical source URL
- city
- district
- price
- surface

A source-present field missed by the parser is `parser_miss`, not generic `missing`.

## Canonical freeze

Artifact `10910779576`

`clean-corpus-v4.11-core.jsonl.gz`

SHA-256 `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`

Verified:

- 226,286 rows
- 226,286 unique URLs
- 222,359 scope eligible
- 225,952 KEEP
- 8,487 URLs with historical HTTP-200 observation metadata
- DB access/write 0/0

Schema correction: this core contains URL/classification/scope/deep-observation metadata, **not city/district/price/surface values**. Previous language calling route candidates `parser_miss` is superseded.

Global strict structured-route evidence:

- city 61,547
- district 48,023
- transaction 60,761
- property type 61,543

State: `recoverable_from_url`, not parser-miss proof.

## Current source lot — Mubawab

Raw URLs: **82,796**

Verified identity reduction:

- detail routes: 81,996
- non-detail routes: 800
- unique detail identities: **74,867**
- duplicate historical URL rows: **7,129**
- raw overcount: **7,929 / 9.577%**
- scope-eligible unique live-fetch plan: **74,486**

Unique route identities:

- `a:<id>`: 72,746
- `pa:<id>`: 2,121

Offline URL parser candidates:

- transaction recoverable 48,739 / conflict 306 / unresolved 25,822
- property type recoverable 63,013 / conflict 4,532 / unresolved 7,322
- surface high 10,331 / review 10,160 / conflict 389 / unresolved 53,987
- city free-slug evidence is review-only

Critical rule: conflicting historical slugs for one source ID never silently resolve to one semantic value.

## Code

Branch: `data/200k-fresh-parser-v2`

HEAD will advance as this lot continues.

Files:

- `scripts/data/audit-github-freeze-parser-readiness-v2.mjs`
- `scripts/data/mubawab-url-parser-v2.mjs`
- `scripts/data/__tests__/mubawab-url-parser-v2.test.mjs`
- `scripts/data/mubawab-freeze-adapter-v2.mjs`
- `scripts/data/mubawab-live-benchmark-v2.mjs`
- `.github/workflows/github-freeze-parser-readiness-v2.yml`
- `.github/workflows/mubawab-parser-v2-benchmark.yml`

Local parser tests: **6/6 passed**.

## DB discipline

No Neon request for analysis reproducible from freeze/artifacts.

Current phase: GitHub freeze + public source verification only.

No Vercel deployment.

## Next exact

Run and inspect the deterministic 100-identity Mubawab live benchmark.

If coverage misses current source-visible city/district/price/surface, change the Mubawab detail parser and rerun the bounded benchmark.

Only after parser yield is certified should the Mubawab live refresh scale beyond the benchmark.
