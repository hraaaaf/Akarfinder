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

Strict rule: a mandatory field may be classified `parser_miss` only when source evidence proves that the field exists but extraction missed it.

## Canonical raw material — verified

- GitHub artifact: `10910779576`
- file: `clean-corpus-v4.11-core.jsonl.gz`
- SHA-256: `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`
- rows: **226,286**
- unique canonical URLs: **226,286**
- KEEP: **225,952**
- scope eligible: **222,359**
- database access/write: **0/0**

Important correction: the canonical core is primarily a URL/crawl-evidence inventory. It is **not** a complete business-field table. Therefore absence of city/district/price/surface in this core cannot by itself prove a parser failure.

## Structured URL recovery evidence

A strict offline route parser finds structured values directly encoded in canonical URL routes:

- city: **61,547**
- district: **48,023**
- transaction_type: **60,761**
- property_type: **61,543**

These are **recoverable URL evidence**, not automatically certified parser misses and not automatically write-safe.

Free-form slug inference remains review-only unless corroborated.

## Largest raw reservoirs

1. Mubawab: **82,796**
2. Sarout: **44,130**
3. MarocImmo: **37,299**
4. Avito: **24,532**
5. Domio: **10,347**
6. Agenz: **9,347**

## Parser V2 evidence states

- `verified`: corroborated source evidence
- `recoverable_from_structured_route`: explicit structured URL segment, pending normalization/corroboration policy
- `parser_miss`: source field proven present but extractor failed
- `source_missing`: source evidence proves field absent
- `conflict`: credible evidence disagrees
- `invalid`: extracted value violates contract
- `review`: insufficient certainty

Never collapse `recoverable_from_structured_route`, `parser_miss` and `source_missing`.

## Freshness

The freeze is discovery material, not proof of current activity. Freshness must be re-established source-side.

To reach 200,000 from the 222,359 eligible frozen URLs alone would require **89.94%** to survive as fresh + mandatory-complete; this is not yet proven.

## Implementation

Branch: `data/200k-fresh-parser-v2`

- `scripts/data/audit-github-freeze-parser-readiness-v2.mjs`
- `.github/workflows/github-freeze-parser-readiness-v2.yml`

No Neon access is needed for this phase.

## Next exact

Mubawab first: inventory its 82,796 canonical URL shapes, separate deterministic route evidence from ambiguous free slugs, locate existing frozen HTTP evidence/artifacts, then build source-specific fixtures before any bounded live refresh.
