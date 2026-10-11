# AkarFinder — National Neighborhood Coverage — Offline Audit (2026-10-11)

## GOAL / SUCCESS / PROOF

**Goal**: enumerate source-backed neighborhood labels and genuine coordinates in the existing HCP/Barid/OSM V5 packed catalog, city by city, **without** implying that a label, center, or administrative arrondissement proves a neighborhood polygon.

**Success**: an exact-code GitHub Actions run decodes all eight N2 chunks and `places-0`, checks accounting invariants and creates a complete JSON report and parent-city CSV.

**Proof**: [GitHub Actions run 38105071300](https://github.com/hraaaaf/Akarfinder/actions/runs/38105071300) — **success** at code HEAD `246de3deeb677230c30d0f3b8524b7c85910ff38`; job `114368732463`; artifact **11689790233**. Script syntax, decoding, invariants, and artifact upload passed. This file is documentation added **after** the validated code commit; it must not be mistaken for a second executed audit.

## VERIFIED INVENTORY

| Source metric | Observed |
|---|---:|
| Places in packed national places catalog | 341 |
| Packed N2 parent groups | 93 |
| Parent groups uniquely linked to place catalog | 70 |
| Parent groups not linked by current exact-key lookup | 23 |
| Ambiguous parent matches | 0 |
| N2 source label rows decoded | **11,413** |
| Source rows with finite valid centers | **1,648** |
| Source rows lacking centers | **9,765** |
| Source rows with invalid centers | **0** |
| OSM-tagged source rows | 1,648 |
| Barid-tagged source rows | 9,765 |
| Repeated normalized names within one parent | 106 |
| Distinct normalized parent+name keys | 11,307 |
| Canonical GEO_NEIGHBORHOODS records | 23 |
| Validated map-eligible canonical neighborhoods | **17 across 8 cities** |
| Reviewed/published actual neighborhood polygon boundaries | **0** |

**Important discrepancy:** `NATIONAL_TERRITORY_META.neighborhoodCount` is statically **10,799**, but decoding the eight actual N2 chunks yields **11,413 rows**, a difference of **614**. These counters must not be conflated. Neither count means certified unique Moroccan neighborhoods.

## CITY CANDIDATES — NOT VALIDATED NEIGHBORHOODS

| City | Map-eligible registered | Packed source labels | Source rows with valid centers | Distinct centered names not matching the current map-eligible canonical names/aliases |
|---|---:|---:|---:|---:|
| Casablanca | 3 | 1,617 | 134 | 130 |
| Rabat | 3 | 318 | 27 | 23 |
| Marrakech | 3 | 1,193 | 44 | 40 |
| Tanger | 2 | 322 | 22 | 22 |
| Agadir | 2 | 254 | 35 | 32 |
| Fès | 2 | 791 | 42 | 38 |
| Kénitra | 1 | 205 | 38 | 38 |
| Mohammedia | 1 | **not joined** | **unknown** | **unknown** |
| **Seven joined cities** | **16** | **4,700** | **342** | **323** |

The national map registry still contains **17** eligible neighborhoods in 8 cities; the 7 joined cities account for **16**, with **Mohammedia** not joined by this source-parent lookup. Do not label it zero coverage.

**Crucial interpretation:** the 323 nonmatching normalized names are a **candidate review queue**, not 323 additional certified neighborhoods; some may be alternate spellings, neighborhood subdivisions, misclassified places, or inconsistent city-parent links.

## FIX-PRIORITY FINDING: PARENT LINKAGE

The packed source contains **23 N2 parent groups not linked to a uniquely matched place**. One striking example is parent `el jadida`: **544 centered source rows, 0 matches** in the currently used exact parent lookup. The runtime `parentKey` removes separators from city names, whereas a packed parent group may preserve them. This discrepancy is a plausible bug contributor; verify the full 23-group source identity and safe normalization contract before changing runtime code.

**Do not** automatically attribute these 544 rows to a similarly spelled city without reviewing source IDs and the parent-key contract. Do not publish these rows as neighborhoods from this finding alone.

## READ-ONLY AUDIT IMPLEMENTATION

- `scripts/audits/national-neighborhood-coverage.mjs`
- `.github/workflows/carte-national-neighborhood-coverage-audit.yml`
- Artifact contents: `data/audits/national-neighborhood-coverage/report.json` and `by-parent.csv`.
- No network fetch, dependency install, DB call, production file mutation, UI change, merge, or Vercel deploy.

This PR [#1111](https://github.com/hraaaaf/Akarfinder/pull/1111) remains **DRAFT**. Cartographic Flat Living Map PR [#1108](https://github.com/hraaaaf/Akarfinder/pull/1108) is a separate product gate, not automatically unblocked by these candidate counts.

## NEXT EXACT / REMAINING SEQUENCE

1. Produce a read-only **23-parent reconciliation matrix** from the CSV: city alias/spelling, available `places-0` candidates, exact source provenance and whether the runtime key mismatch is reproducible. First prioritize **El Jadida** and **Mohammedia**. No speculative joins.
2. Fix and test the stale `10,799` meta count against the actual packed source count (do not silently change upstream data). Keep **raw**, **mapped** and **centered** metrics distinct.
3. Qualify the **323** centered name candidates in the seven currently joined cities by unique city-scoped identity; separate axes, landmarks, districts, neighborhoods and aliases. Review source attribution and ODbL requirements.
4. Only after source qualification, add or enable each validated center through the existing shared MapLibre engine. Do not infer polygon boundaries or force `map_eligible` from names alone.
5. For any product UI change: BEFORE, TARGET, 390/430/768/1280 AFTER, compare, accessibility and actual tile/POI checks. Maintain unrelated PR gates and explicit merge/Vercel human authorization.
6. Merge/post-merge/closeout only with required gates actually proven; do not merge this draft audit PR on the basis of a green single workflow.

**Current completion**: offline national **inventory measured**; actual expanded, verified **national quartier coverage NOT achieved**. No new neighborhood promoted.

**Notion cross-reference**: https://app.notion.com/p/3f677c6633628114aaa1eedfeb448473

## COMPLETE 23-PARENT RECONCILIATION BACKLOG — VERIFIED

CI [38105223915](https://github.com/hraaaaf/Akarfinder/actions/runs/38105223915) **SUCCESS** on exact audit code HEAD `7258f7a8454085c509344a26c7cdf95433d9431d`, job `114369201962`. The job logs include the complete 23-group backlog below.

- **23 parent groups** unlinked to a unique city/place in current normalized runtime lookup.
- **1,255 unlinked source label rows**, including **675 centered** and **580 lacking a center**.
- The total **1,648 centered rows = 973 from source parents joined unambiguously to places + 675 from unlinked parents**. Neither population equals a set of reviewed neighborhoods.
- El Jadida alone contributes **544** source center rows under a currently unlinked `el jadida` parent. **No automatic re-parenting**.

| Packed parent key (not verified canonical city) | Source rows | Centered | Missing center |
|---|---:|---:|---:|
| el jadida | 544 | 544 | 0 |
| dcheira el jihadia | 48 | 48 | 0 |
| ait melloul | 16 | 16 | 0 |
| kasba tadla | 13 | 13 | 0 |
| al hoceima | 37 | 12 | 25 |
| es semara | 6 | 6 | 0 |
| sidi bibi | 5 | 5 | 0 |
| el hajeb | 5 | 5 | 0 |
| m diq | 4 | 4 | 0 |
| sidi kacem | 77 | 3 | 74 |
| mechouar fes jdid | 3 | 3 | 0 |
| beni mellal | 483 | 2 | 481 |
| madagh | 2 | 2 | 0 |
| oued zem | 2 | 2 | 0 |
| el marsa | 2 | 2 | 0 |
| fkih ben salah | 1 | 1 | 0 |
| ain bni mathar | 1 | 1 | 0 |
| imouzzer kandar | 1 | 1 | 0 |
| sidi yahya gharb | 1 | 1 | 0 |
| sidi ifni | 1 | 1 | 0 |
| bab taza | 1 | 1 | 0 |
| al machouar stinia | 1 | 1 | 0 |
| had soualem | 1 | 1 | 0 |

### Root-cause hypothesis and fail-closed policy

The V5 builder records parent names in multiple source-specific normal forms (`parentCityNormalized`); the runtime performs its own `parentKey` normalization on place display names and looks up exact keys. The 23 misses may reflect name, separator, transliteration or missing-place divergences. Inspect the exact source pair and canonical city identity before changing the resolver. **Never infer an OSM neighborhood parent from a nearby point or name alone.**

Next: introduce a deterministic, collision-checked candidate parent alias matrix for these 23 group keys on an isolated feature branch, with explicit `unresolved` outcomes and tests. No silent fuzzy matching, no polygon publication, no deploy.
