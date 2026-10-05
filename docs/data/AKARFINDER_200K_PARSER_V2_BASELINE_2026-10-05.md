# AkarFinder — 200K Fresh Listings / Parser V2 Baseline

Date: 2026-10-05

## Goal

Reach **>= 200,000 fresh, unique, exploitable listings**.

Minimum exploitable contract:

- canonical source URL
- city
- district
- price
- surface

Strict rule: if a mandatory field is provably present in current source evidence but extraction misses it, classify it as `parser_miss`, never generic `missing`.

## Canonical raw material — verified

GitHub artifact: `10910779576`

File: `clean-corpus-v4.11-core.jsonl.gz`

SHA-256:

`e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`

Verified core baseline:

- rows: **226,286**
- unique canonical URLs: **226,286**
- KEEP: **225,952**
- scope eligible: **222,359**
- EXPIRED classification rows: **45**
- NON_REAL_ESTATE rows: **289**
- URLs carrying a historical HTTP-200 observation marker: **8,487**
- database access: **0**
- database writes: **0**

Important schema correction:

The canonical `core` freeze stores URL identity, classification, scope and deep-observation metadata. It **does not store listing business fields** such as city, district, price or surface. Therefore this freeze alone cannot prove a `parser_miss` for those fields.

## Recoverable structured-route evidence

A strict offline route pass finds source-controlled URL segments that can be retained as recovery evidence without any live request:

- city candidates: **61,547**
- district candidates: **48,023**
- transaction_type candidates: **60,761**
- property_type candidates: **61,543**

These are **`recoverable_from_url` candidates**, not parser-miss counts.

## Source priority by raw URL volume

1. `mubawab.ma`: **82,796**
2. `sarout.ma`: **44,130**
3. `marocimmo.com`: **37,299**
4. `avito.ma`: **24,532**
5. `domio.ma`: **10,347**
6. `agenz.ma`: **9,347**
7. `daragadir.com`: **6,711**
8. `promoimmomarrakech.com`: **3,716**
9. `masaken.ma`: **2,047**
10. `mouldar.com`: **1,641**

## Mubawab lot — offline baseline

Raw Mubawab URL rows: **82,796**

Identity normalization:

- detail-route rows (`/a/<id>` or `/pa/<id>`): **81,996**
- non-detail/search/navigation routes: **800**
- unique detail identities: **74,867**
  - individual `a:<id>`: **72,746**
  - project `pa:<id>`: **2,121**
- duplicate historical URL rows beyond unique detail identities: **7,129**
- raw URL overcount versus unique detail identities: **7,929 (9.577%)**
- scope-eligible deduplicated live-fetch plan: **74,486**

Therefore AkarFinder must count/crawl **Mubawab identity IDs**, not raw historical URLs.

### URL evidence recovered safely

Across the 74,867 unique Mubawab detail identities:

Transaction:
- recoverable from explicit slug evidence: **48,739**
- historical conflict: **306**
- unresolved: **25,822**

Property type:
- recoverable: **63,013**
- conflict: **4,532**
- unresolved: **7,322**

Surface:
- high-confidence primary-surface candidate: **10,331**
- review-only candidate: **10,160**
- conflicting multiple surfaces: **389**
- unresolved: **53,987**

City tokens from free slugs remain **review evidence only**:
- one city token: **13,932**
- multiple/conflicting: **242**
- none: **60,693**

Historical slugs can contradict each other for the same Mubawab ID. No semantic value is silently selected when that happens.

## Parser V2 doctrine

Evidence priority:

1. source-specific stable identity / structured route
2. JSON-LD
3. embedded application state / public structured payload
4. explicit labeled DOM
5. breadcrumb / location heading consensus
6. constrained text extraction
7. free-slug heuristic as review-only unless corroborated

Per-field provenance:

- normalized value
- raw evidence
- extraction mechanism
- confidence
- state

States:

- `verified`
- `recoverable_from_url`
- `parser_miss`
- `source_missing`
- `conflict`
- `invalid`
- `review`
- `unresolved`

## Freshness

The freeze is discovery/raw material, **not proof that listings are still active**.

Freshness must be re-established source-side with:

- first_seen_at
- last_seen_at
- last_verified_at
- active / stale / gone

Neon is not required for this phase.

## Implementation

Branch: `data/200k-fresh-parser-v2`

Global baseline:
- `scripts/data/audit-github-freeze-parser-readiness-v2.mjs`
- `.github/workflows/github-freeze-parser-readiness-v2.yml`

Mubawab:
- `scripts/data/mubawab-url-parser-v2.mjs`
- `scripts/data/__tests__/mubawab-url-parser-v2.test.mjs`
- `scripts/data/mubawab-freeze-adapter-v2.mjs`
- `scripts/data/mubawab-live-benchmark-v2.mjs`
- `.github/workflows/mubawab-parser-v2-benchmark.yml`

Local parser regression result before commit: **6/6 tests pass**.

## Next exact

Run the bounded **100-identity Mubawab live benchmark**.

Success evidence required:

- robots policy respected
- 100 deterministic deduplicated identities attempted
- current live/stale response distribution measured
- city/district/price/surface coverage measured
- any source-present/extractor-missing field classified as `parser_miss`
- database access/write = 0/0

Then improve the Mubawab detail parser until mandatory-field yield is acceptable before scaling the live refresh.
