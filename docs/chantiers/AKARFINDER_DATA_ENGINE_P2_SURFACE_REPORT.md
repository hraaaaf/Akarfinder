# AkarFinder Data Engine — P2 Surface Enrichment

Date: 2026-09-05

## Goal
Increase surface coverage for current verified Mubawab detail listings without bulk detail-page crawling and without accepting ambiguous numeric values.

## Baseline
- Current verified Mubawab detail IDs: 163
- With surface before this lot: 104
- Without surface before this lot: 59

## Recovery
### Direct URL evidence
10 surfaces were recovered from explicit `m²/m2` values embedded in the canonical detail URL.

### Robots-safe shard card recovery
Workflow run: `33986849698`
- Targets entering shard recovery: 49
- Targets mapped to certified safe shards: 49
- Unique safe shard requests: 48
- Surfaces recovered: 2
- Unresolved: 47
- Detail page requests: 0
- Early stop: none
- Result: SUCCESS

Recovered from shard cards:
- source ID 8095757 → 875 m²
- source ID 8323060 → 60 m²

## Result
- With surface: 116 / 163
- Without surface: 47 / 163
- Surface coverage: 71.17%
- Net surfaces recovered in this lot: 12

## Evidence ceiling
The 47 remaining cases had no unique `m²/m2` value recoverable from their mapped current safe shard card. They remain unresolved rather than guessed.

## Safety contract
- Zero detail page requests in automated shard recovery.
- Only explicit `m²/m2` values attached to the target listing card are accepted.
- Existing non-empty surfaces are never overwritten.
- Ambiguous multiple surface values are rejected.

## Status
P2 surface sub-lot: PASS at current evidence ceiling.
