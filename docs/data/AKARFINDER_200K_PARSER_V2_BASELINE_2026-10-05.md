# AkarFinder — 200K Fresh Listings / Parser V2 Baseline

Date: 2026-10-05

## Goal

Reach **>= 200,000 fresh, exploitable listings**.

An exploitable listing must have, at minimum:

- canonical source URL
- city
- district
- price
- surface

If one of these fields is present in the source but absent after extraction, classify it as a **parser failure**, not as generic missing data.

## Canonical raw material

GitHub artifact: `10910779576`

File: `clean-corpus-v4.11-core.jsonl.gz`

SHA-256:

`e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`

Verified offline baseline:

- rows: **226,286**
- unique canonical URLs: **226,286**
- KEEP: **225,952**
- scope eligible: **222,359**
- deep HTTP 200 snapshots: **8,487**
- rows already complete for URL + city + district + price + surface: **1,191**
- database access: **0**
- database writes: **0**

The raw pool is therefore large enough in absolute URL count, but the existing enrichment coverage is far below the new Goal.

## Existing field coverage in the raw freeze

- city: **8,454**
- district: **6,296**
- price_mad: **3,770**
- surface_m2: **4,567**
- title: **8,487**
- description: **8,487**
- published_at: **8,487**

Only the deep-observed minority carries enriched fields.

## Definite parser misses recoverable from structured URL routes

A first strict offline route parser was run without source fetches.

High-confidence route candidates:

- city: **61,547**
- district: **48,023**
- transaction_type: **60,761**
- property_type: **61,543**

Fields absent from the freeze despite explicit structured-route evidence:

- city parser misses: **53,553**
- district parser misses: **43,524**
- transaction_type parser misses: **60,761**
- property_type parser misses: **61,543**
- total definite structured-route parser misses: **219,381 field values**
- conflicts against already populated values: **0**

This is the first proven recovery layer and requires no database access and no live-site request.

## Source priority by raw volume

1. `mubawab.ma`: **82,796** rows
2. `sarout.ma`: **44,130**
3. `marocimmo.com`: **37,299**
4. `avito.ma`: **24,532**
5. `domio.ma`: **10,347**
6. `agenz.ma`: **9,347**
7. `daragadir.com`: **6,711**
8. `promoimmomarrakech.com`: **3,716**
9. `masaken.ma`: **2,047**
10. `mouldar.com`: **1,641**

## Important parser-quality signals from existing deep snapshots

### Domio

Deep HTTP 200: **3,495**

- city: 100%
- price: 95.11%
- surface: 60.60%
- district: 51.42%
- complete mandatory set: 33.65%

Immediate parser target: district + surface.

### MarocImmo

Deep HTTP 200: **4,499**

- city: 100%
- district: 100%
- surface: 46.34%
- price: **0.42%**
- complete mandatory set: **0.33%**

Immediate parser target: price first, then surface.

### Sarout

Deep HTTP 200: **493**

- city: 93.31%
- price: 86.61%
- surface: 73.83%
- district: **0%**
- complete mandatory set: 0%

Immediate parser target: district.

## Parser V2 doctrine

Extraction order:

1. source-specific structured route
2. JSON-LD
3. embedded application state / public structured payload
4. labeled DOM
5. breadcrumb / explicit location hierarchy
6. constrained text regex
7. heuristic free-slug parsing only as review evidence

Every field must retain:

- normalized value
- raw evidence
- source mechanism
- confidence
- extraction reason

States:

- `verified`
- `parser_miss`
- `source_missing`
- `conflict`
- `invalid`
- `review`

Never collapse `parser_miss` into `source_missing`.

## Freshness rule

The 226,286-row freeze is discovery/raw material, not proof that listings are currently active.

Do not spend database quota to refresh it.

Freshness must be re-established source-side during later source-specific refresh waves, with lifecycle fields such as:

- first_seen_at
- last_seen_at
- last_verified_at
- active / stale / gone

## Current implementation

Branch: `data/200k-fresh-parser-v2`

Audit script:

`scripts/data/audit-github-freeze-parser-readiness-v2.mjs`

CI workflow:

`.github/workflows/github-freeze-parser-readiness-v2.yml`

The workflow downloads only the canonical GitHub freeze, verifies its digest, performs the offline audit and uploads parser-miss artifacts. It does not access Neon.

## Next exact

Extend the offline parser to the four biggest raw sources in this order:

1. Mubawab
2. Sarout
3. MarocImmo
4. Avito

For every source:

- derive all high-confidence fields available without a live request
- classify unresolved mandatory fields
- build source-specific regression fixtures
- then perform a bounded fresh source pass only for unresolved freshness / price / surface / district evidence

No Neon access is needed for this phase.
