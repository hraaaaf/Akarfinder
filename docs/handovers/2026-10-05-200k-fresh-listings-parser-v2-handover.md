# AkarFinder — 200K Fresh Listings / Parser V2 Handover

Date: 2026-10-05

## Goal

>= **200,000 fresh, unique, exploitable listings**.

Mandatory exploitable fields:

- canonical source URL
- city
- district
- price
- surface

Strict rule: when a mandatory field exists in source evidence but extraction misses it, the state is `parser_miss`, never generic `missing`.

## Raw baseline — verified

Canonical GitHub freeze:

- artifact: `10910779576`
- file: `clean-corpus-v4.11-core.jsonl.gz`
- SHA-256: `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`
- rows: **226,286**
- unique URLs: **226,286**
- scope eligible: **222,359**
- KEEP: **225,952**
- DB access/write: **0/0**

Existing enrichment:

- deep HTTP 200: **8,487**
- city: **8,454**
- district: **6,296**
- price: **3,770**
- surface: **4,567**
- mandatory-complete: **1,191**

To reach 200,000 using this eligible pool alone would require at least **89.94%** of the 222,359 eligible URLs to still be live and exploitable. This survival rate is not yet verified.

## Parser-readiness V2 — first offline pass

Branch: `data/200k-fresh-parser-v2`

Script:

`scripts/data/audit-github-freeze-parser-readiness-v2.mjs`

Workflow:

`.github/workflows/github-freeze-parser-readiness-v2.yml`

Strict structured-route evidence produced:

- city candidates: **61,547**
- district candidates: **48,023**
- transaction candidates: **60,761**
- property-type candidates: **61,543**

Definite parser misses where the freeze field is absent:

- city: **53,553**
- district: **43,524**
- transaction_type: **60,761**
- property_type: **61,543**
- total field misses: **219,381**
- conflicts with existing populated values: **0**

No source-site request was required for this pass.

## Largest reservoirs

- Mubawab: **82,796**
- Sarout: **44,130**
- MarocImmo: **37,299**
- Avito: **24,532**
- Domio: **10,347**
- Agenz: **9,347**

## Existing deep-snapshot parser signals

Domio, 3,495 HTTP 200:
- city 100%
- price 95.11%
- surface 60.60%
- district 51.42%
- mandatory-complete 33.65%

MarocImmo, 4,499 HTTP 200:
- city 100%
- district 100%
- surface 46.34%
- price 0.42%
- mandatory-complete 0.33%

Sarout, 493 HTTP 200:
- city 93.31%
- price 86.61%
- surface 73.83%
- district 0%
- mandatory-complete 0%

## Free-slug warning

A lexical experiment on Mubawab/Sarout/Avito shows large extraction potential, but free-slug city inference is **not safe enough for automatic write**.

Sarout produced city conflicts against existing enriched values when city names appeared contextually in slugs. Therefore:

- structured route segments may be high confidence;
- free-slug evidence stays `review` until corroborated;
- no city may be inferred from an ambiguous district alone.

## Freeze-first / DB discipline

Do not query Neon for work reproducible from GitHub freeze/artifacts.

Neon is reserved for a single live preflight immediately before a future controlled write, followed by explicit human gate.

## Next exact

1. Complete source adapters for the four biggest reservoirs: Mubawab, Sarout, MarocImmo, Avito.
2. For each URL, emit per-field provenance and states: verified / parser_miss / source_missing / conflict / invalid / review.
3. Use offline evidence first.
4. Build deterministic fixtures from frozen URLs and existing deep snapshots.
5. Only then launch bounded fresh source waves for unresolved mandatory fields and freshness.
6. Measure unique + fresh + mandatory-complete count against the 200K Goal.
