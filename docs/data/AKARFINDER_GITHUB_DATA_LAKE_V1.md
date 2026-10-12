# AkarFinder — GitHub Data Lake V1

## Goal
Use GitHub Actions + immutable artifacts as the off-database acquisition and certification plane for the 200K fresh listings objective.

## Success
A listing is promotable to the live database only when it is fresh, canonical/deduplicated, and satisfies the strict searchable contract:
- source URL
- city
- district/neighborhood
- price
- surface area

## Architecture
Sources -> GitHub Actions acquisition -> immutable raw/certified artifacts -> parsing/enrichment -> validation/dedup/freshness -> promotion manifest -> live DB.

GitHub is not the production search database. It is the reproducible data lake/staging/certification plane.

## Artifact layers
1. RAW: canonical URLs + acquisition evidence.
2. OBSERVED: fetched source evidence, HTTP/freshness state, parser provenance.
3. NORMALIZED: typed normalized fields with per-field provenance/confidence.
4. CERTIFIED: rows satisfying the strict five-field contract and validation rules.
5. PROMOTION MANIFEST: immutable batch approved for the single controlled DB write stage.

## Required states
Per mandatory field:
- verified
- recoverable_from_structured_route
- parser_miss
- source_missing
- conflict
- invalid
- review

`parser_miss` requires evidence that the source contains the field and the extractor failed.

## Safety
- No DB access is required for acquisition, parsing, enrichment, deduplication, or certification.
- No production write from ordinary acquisition workflows.
- A live DB preflight is allowed only immediately before a controlled promotion to detect drift/conflicts.
- Actual DB apply remains a separate human-gated operation.
- No anti-bot/CAPTCHA bypass.

## Reproducibility
Each certified artifact must carry:
- source
- acquisition/fetch timestamp
- canonical URL
- content/evidence hash when available
- parser/schema version
- provenance per field
- counts by validation state
- database_access = 0
- database_writes = 0

## Current anchor
Canonical raw freeze:
- rows: 226,286
- unique canonical URLs: 226,286
- scope eligible: 222,359
- artifact id: 10910779576
- SHA-256: e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953

This freeze is discovery/raw material, not proof that listings are currently fresh or satisfy the five-field contract.

## Promotion rule
Never count a row toward the 200K goal merely because its URL exists in RAW. Count it only after freshness + five mandatory fields + canonical deduplication are certified.

## Current pilot
Mubawab deterministic 300 pilot is the first bounded validation pass. The existing generic full-field recovery pass does not itself certify `price_mad`; price must be added through a certified semantic/source-specific extraction path before the five-field contract can be declared complete.
