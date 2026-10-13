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
