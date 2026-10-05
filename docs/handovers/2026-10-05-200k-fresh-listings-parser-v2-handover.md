# AkarFinder — 200K Fresh Listings / Parser V2 Handover

Date: 2026-10-05

## Goal

>= **200,000 fresh, unique, exploitable listings** with canonical URL + city + district + price + surface.

A `parser_miss` requires proof that the source contains the field. The canonical 226k core is a URL/crawl-evidence inventory and must not be treated as a complete field table.

## Verified raw baseline

- artifact `10910779576`
- `clean-corpus-v4.11-core.jsonl.gz`
- SHA-256 `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`
- **226,286 rows / 226,286 unique URLs**
- **222,359 scope eligible**
- **225,952 KEEP**
- DB access/write **0/0**

## Offline structured-route evidence

Explicit route structures expose:
- city **61,547**
- district **48,023**
- transaction **60,761**
- property type **61,543**

Correct classification: `recoverable_from_structured_route`, pending source-specific normalization/corroboration. These counts are not certified parser misses.

## Priority reservoirs

Mubawab 82,796 → Sarout 44,130 → MarocImmo 37,299 → Avito 24,532.

## Safety

- free-form slug inference = review unless corroborated
- no Neon query for reproducible offline work
- no DB write
- freshness only after bounded source-side verification

## Next exact

Build Mubawab adapter and fixtures from the freeze + existing GitHub HTTP evidence. Measure deterministic URL evidence first; then identify exactly which mandatory fields require bounded fresh retrieval.
