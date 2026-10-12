# National Territory V6 — Source identity and parent-provenance shadow contract

**Scope:** Offline, read-only provenance and reconciliation. No runtime rollout, automatic promotions, polygons, Search district filters, or DB writes.

## Inputs and IDs

Historical V5 producer: [run 32634250993](https://github.com/hraaaaf/Akarfinder/actions/runs/32634250993), commit 1aa0f033fefc16bb1fd8981c055f37756b3ba714. Original "neighborhoods.json" recorded an "osm:node|way|relation:id" for each OSM row, plus name, source kinds, center, and source "parentCityNormalized". It did **not** store original OSM place tag or the parent boundary relation ID in each row. V6 must therefore use explicit null fields for unknown facts, not fabricate them.

## Mandatory V6 shadow record

1. **sourceIdentity**: originalId; exact osmType/osmId when OSM; explicit absent osmTag with a status; producer SHA, source snapshot descriptor, license status.
2. **label**: source name, normalized name, source coordinates or null.
3. **parentProvenance**: parent name, normalized parent key and source association method: candidate OSM polygon uniquely contains center, no unique city polygon, or Barid postal city label. Where historical V5 lost source relation ID, set boundaryRelationId = null and status "not_retained_by_v5_neighborhood_row". Candidate city polygons do not confer official quartier boundary.
4. **review**: publicationStatus "hold_no_publication", mapEligible false, neighborhoodPolygon null, districtListingFilterAllowed false. No source-only candidate automatically becomes a legally valid quartier or a property filter.

Future V6 packaging must roundtrip both **osmType and osmId unchanged**, preserve the exact source feature tag, parent association candidates, parent boundary relation ID (where verified), matching method, source checksum/date and decision ledger; fail closed on duplicates, missing IDs, joins from proximity/name alone, or unresolved parents.

## Historical gap: what is proven, what is blocked

| Population | Original V5 (2026-08-23) | Embedded N2 | Difference |
|---|---:|---:|---:|
| Postal candidate rows | 9,765 | 9,765 | 0 |
| OSM candidate rows | 1,900 | 1,648 | **252** |
| Total candidates | 11,665 | 11,413 | **252** |
| OSM uniquely parented by V5 candidate polygon | 1,734 | no comparable lineage field | not derivable |
| OSM not uniquely parented in V5 | 166 | no comparable lineage field | not derivable |

The arithmetic 1,734−1,648 = **86** is **not** evidence that a specific set of 86 parented OSM objects was dropped. The historical V5 artifact ID **9491880775** is expired: GitHub's run artifact collection returns zero downloadable artifacts. N2 discarded per-feature OSM IDs. Therefore **zero of the specific 252 objects can be identified from this evidence**, and their individual exclusion reasons are unknown. Do not equate the distinct 614 difference between N2 rows and stored V5 place-declared counts with these 252.

A fresh download of Geofabrik "morocco-latest.osm.pbf" is **mutable** and cannot silently substitute for the historical August 2026 PBF. Recover the original pinned historical neighborhoods.json and ideally the original checksum, or explicitly label a future new build as a new snapshot.

## Executable audit

- Core script: "scripts/audits/national-v6-osm-lineage.mjs" decodes all N2 chunks and emits "v6-source-lineage-audit.json" with **status=blocked_missing_historical_v5_neighborhoods_json**, exact aggregate count reconciliation, null missing OSM object IDs and null object-level reasons when original V5 is absent.
- Historical replay mode: supply "V5_HISTORICAL_ARTIFACT_DIR" pointing to original V5 output holding "neighborhoods.json". Script constructs V6 shadow records and compares source label + 7-decimal coordinate tuples. Unique tuples are tentative trace links only, never authentic recovered N2 OSM IDs. Ambiguous duplicate labels/centers and parent drift stay HOLD. Historical class counts and all original ID uniqueness must pass.
- Adversarial fixtures: "scripts/audits/__tests__/national-v6-lineage.test.mjs" tests original ID preservation, null provenance, nonpromotion, original absence, no duplicate tuple guessing, parent mismatch, source kind validation and Barid identity.
- CI: ".github/workflows/carte-national-v6-provenance-shadow.yml", uploads read-only result; cannot publish source-only localities.

## Goal / Success / Proof / Next

**Goal:** V6 source identity contract and exact classification where evidence allows.

**Success:** schema+code+adversarial tests checked by CI, frozen historical/current counts cross-checked, absent artifact represented as a real blocked object-level gate. **This does NOT meet object-level reconciliation**.

**Proof:** exact-head CI run, JSON artifact, immutable historical build log and GitHub artifact availability request.

**Next exact:** recover historical neighborhoods.json (or immutable source snapshot provenance) to run ID-level V5→N2 reconciliation and demonstrate the actual absent IDs, then design a producer that carries IDs, source tags, and polygon-parent relation candidates through the pack. No runtime publication, no merge/deploy without subsequent gates.
## Verified round-trip implementation and CI — 2026-10-12

The source contract now includes **implemented** pack/unpack functions on the shadow side only: `packV6Provenance` and `unpackV6Provenance`. They use Brotli, SHA-256 of the complete source JSON envelope, immutable original OSM IDs, parent name/key and method, explicit nullable OSM tags/relation IDs and fail-closed HOLD semantics. They assert unique IDs and reject any `mapEligible=true` or invented property district filter.

[Exact-code CI #38267505881](https://github.com/hraaaaf/Akarfinder/actions/runs/38267505881) **SUCCESS** at `a1939bae18c864c8b096e0c9c017e7b08dcc26d7`: **12 deterministic tests / 12 passed**, real packed N2 count `11,413=1,648 OSM + 9,765 Barid`, delta `252` and source-artifact BLOCKED contract verified. This is **not** an activated V6 runtime or a completed historical per-object 252 audit.
