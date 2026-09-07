# AkarFinder Data Engine — P2 District Enrichment

Date: 2026-09-05

## Goal
Enrich the district field for current verified Mubawab detail listings without guessing and without opening detail pages in bulk.

## Evidence sources
1. Explicit district token in title, matched against city-specific district values already present in `property_listings`.
2. Explicit locality token in title for obvious high-confidence cases missing from the existing dictionary.
3. Provenance from the certified robots-safe Mubawab sweep: unique `cd/<city>/<district>/...` shard membership, accepted only when shard city matches the canonical listing city.

## Result
- Current verified Mubawab detail source IDs observed in the canonical layer at close: 163
- With district after enrichment: 132
- Without district: 31
- District coverage: 80.98%
- Rows enriched in this lot: 72

### Enrichment breakdown
- 22 via explicit title + existing city-specific district dictionary
- 29 via explicit high-confidence locality mention in title
- 21 via unique, city-consistent certified `cd` shard provenance

## Rejected / unresolved
- 5 listings had multiple competing `cd` district shards and were left untouched.
- 1 listing had a city/shard inconsistency (`Khouribga` canonical city vs `Oujda` shard evidence) and was rejected.
- 25 listings had no reliable district signal in the current evidence and were left null/empty.

## Safety contract
- No bulk detail-page crawl.
- No inferred district from weak landmarks or generic wording.
- No overwrite of an existing non-empty district.
- High confidence is written only for explicit or unique, city-consistent evidence.
- Ambiguous evidence remains unresolved.

## Status
P2 district sub-lot: PASS at the current evidence ceiling.
Next enrichment priority: surface coverage, then unresolved district cases can be revisited when stronger evidence appears.
