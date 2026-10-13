# National territory V6 — new OSM snapshot and original-ID ledger

Goal: preserve every extracted OpenStreetMap source identity and exact decision in a new versioned source, without inventing the lost 2026-08 historical record.

## Acceptance / proof
- Offline Python syntax and 14 adversarial tests green.
- PBF downloaded from Geofabrik Morocco, MD5 validated against Geofabrik sidecar; PBF SHA256, UTC acquisition time, Osmium version, source GeoJSON SHA256 and script SHA256 saved in manifest.
- One v6-ledger.jsonl row per extracted OSM feature including node/way/relation ID, original place tag, source name/center, source feature SHA256, candidate OSM admin relation IDs and a retention or explicit rejection reason.
- All 8/9 admin relations are candidates only; overlap remains ambiguous, no unverified quartier geometry.
- v6-sources.jsonl never carries a production promotion: HOLD, mapEligible=false, no certified neighborhood polygon, no district property filter.
- Missing/duplicate source IDs or invalid admin relation identity fail the workflow, with an audit manifest produced.
- GitHub workflow: .github/workflows/carte-national-v6-osm-snapshot-shadow.yml, read-only source audit; filtered input PBF and GeoJSON, manifest and ledger uploaded with 90-day artifact retention. Full raw PBF not archived permanently.

## Evidence limit
This is a NEW Geofabrik Morocco snapshot. It is not an exact replay of V5 run 32634250993 (2026-08-23). Historic V5 had 1,900 source OSM candidates; packed N2 has 1,648 (difference 252). The original detailed artifact #9491880775 expired; Drive searches for the source artifact, run ID, neighborhoods.json and old PBF were empty. The exact missing 252 original OSM IDs and omission reasons remain UNKNOWN. Do not reinterpret a fresh source change as a historic exclusion.

Scope is OSM labels only, not HCP/Barid full national catalog. This source-only workflow does not change the public MapLibre engine, Search, canonical registry, database or Vercel deployment. Success of CI is not authority to publish any new quartier.

Next: validate the real national snapshot manifest and samples; archive filtered source inputs durably beyond 90 days if necessary; then design a separately reviewed identity and neighborhood semantic join with source-to-product publication gates.

## 2026-10-13 live snapshot first-run root cause

First real run #38389717234 verified Geofabrik MD5 and recorded PBF SHA256 82425e414f2c581c97cbc89723ae5f3115b2d3e5a7e98cc7fc833ee609160bd4. It emitted 2,183 exported OSM features: 1,958 held source records and 225 excluded raw geometries. It failed closed on 120 repeated way IDs and 10 non-relation admin geometries. Reading the uploaded OSM GeoJSON proved all 120 repeats are one identical OSM way exported in two geometric formats (LineString + MultiPolygon), with identical tags and bbox centers, and all 10 admin candidates are way polygons, not relations. Revised rules keep every raw input in the ledger; treat only explicitly identical two-format exports as non-conflicting variants; treat non-relation admin polygons as excluded candidate parents with audit reasons. Truly conflicting source IDs and invalid relation IDs still fail closed. This was not evidence of the historical 252 IDs or neighborhood boundaries.


## First national snapshot certified: 2026-10-13

**[CI #38390371557](https://github.com/hraaaaf/Akarfinder/actions/runs/38390371557) SUCCESS**, exact implementation SHA `0407013276d7b32971d89192a3841163d4108673`, **17/17 tests passing**. External Geofabrik PBF MD5 and SHA-256 checked; parsed inputs and outputs were uploaded into [GitHub artifact 11808252110](https://github.com/hraaaaf/Akarfinder/actions/runs/38390371557/artifacts/11808252110).

- PBF SHA-256 `82425e414f2c581c97cbc89723ae5f3115b2d3e5a7e98cc7fc833ee609160bd4`, snapshot at `2026-10-13T11:28:28Z`.
- 2,183 OSM exported feature views, 2,183 audit rows, 1,958 unique retained source identities, 225 excluded feature views. 120 are Osmium dual LineString/MultiPolygon views for the same way OSM ID, **not identity collisions**. Ten admin shapes are non-relation ways and excluded from parent relation candidates with explicit reasons.
- 1,527 candidate OSM administrative relation polygons; within 1,958 retained labels: 1,271 unique candidate parents, 686 multiple/ambiguous, 1 no candidate parent. All **provisional**, not validated quartier boundaries.
- SHA-256 recomputed from **downloaded** source ZIP for the two output JSONL files and matched manifest. 1,958 source IDs distinct; no hidden promotions.
- Secondary [Google Drive archive](https://drive.google.com/file/d/14XxiTD15uKc2aqwto2Qr7_C_d-t1tDK5/view?usp=drivesdk), uploaded and verified by Drive metadata as **5,201,868 bytes**. Complete raw original 243,761,899-byte PBF is **not** included; exact source replay therefore still requires the corresponding full PBF snapshot.
- First [CI #38389717234](https://github.com/hraaaaf/Akarfinder/actions/runs/38389717234) was correctly red until Osmium's legitimate two-view way export was diagnosed from real raw GeoJSON and differentiated from genuinely conflicting IDs; the corrected script adds 3 adverse cases.
- This source-only certification does not identify the 252 historical OSM omissions, nor validate any new official quartier, listing geofilter or cartographic boundary.

**Next:** review ambiguous admin parents and labels by cohort, with source identity/semantics, before any map/regulatory or Search handoff. No DB write, Vercel deploy or merge.
