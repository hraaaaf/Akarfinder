#!/usr/bin/env python3
"""V2 registry builder: independent high-precision source joins.

- HCP 2024 remains the official municipality spine.
- Barid is joined directly to OSM for the 34 postal cities with neighborhood names.
- Only explicit, audited spelling aliases are allowed. No fuzzy geometry assignment.
"""

from __future__ import annotations

import importlib.util
import json
import re
from collections import defaultdict
from pathlib import Path

BASE_PATH = Path(__file__).with_name("build-morocco-territory-registry.py")
spec = importlib.util.spec_from_file_location("territory_v1", BASE_PATH)
base = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(base)

OUT = Path("data/audits/morocco-territory-registry")
OUT.mkdir(parents=True, exist_ok=True)

# Explicit source spelling differences observed between Barid and OSM.
BARID_OSM_ALIASES = {
    "mohammadia": "mohammedia",
    "ouezzane": "ouazzane",
}


def keys(value: str):
    normalized = base.norm(value)
    compact = normalized.replace(" ", "")
    return {normalized, compact, BARID_OSM_ALIASES.get(normalized, "")}-{""}


def dedupe_relations(rows):
    by_id = {}
    for row in rows:
        by_id[int(row["relationId"])] = row
    return list(by_id.values())


def hcp_entities_and_urban():
    sheets = base.parse_xlsx(base.fetch_bytes(base.HCP_XLSX), "hcp-territory-v2.xlsx")
    sheet = max(sheets, key=lambda item: len(item["rows"]))
    entities = []
    urban = []
    for row in sheet["rows"]:
        if len(row) < 7:
            continue
        name = row[0].strip()
        code = row[6].strip()
        if not name or not code:
            continue
        entity_type = None
        if name.startswith(("Région de ", "Région d'")):
            entity_type = "region"
        elif name.startswith(("Préfecture de ", "Préfecture d'", "Province de ", "Province d'")):
            entity_type = "province_prefecture"
        elif name.startswith(("Arrondissement de ", "Arrondissement d'")):
            entity_type = "arrondissement"
        elif name.startswith(("Commune de ", "Commune d'")):
            entity_type = "commune"
        elif name.startswith(("Cercle de ", "Cercle d'")):
            entity_type = "cercle"
        elif name.startswith("dont le centre urbain"):
            entity_type = "urban_center"
        if not entity_type:
            continue
        entity = {
            "name": name,
            "normalizedName": base.norm(name),
            "code": code,
            "type": entity_type,
            "population": base.parse_int(row[3] if len(row) > 3 else ""),
            "households": base.parse_int(row[4] if len(row) > 4 else ""),
        }
        entities.append(entity)
        if entity_type == "commune" and re.match(r"^\d{1,2}\.\d{3}\.01(?:\.(?:0|\d{1,2}))?$", code):
            urban.append(entity)
    return entities, urban


def relation_index(osm_rows):
    index = defaultdict(list)
    for osm in osm_rows:
        for name in osm["names"]:
            for key in keys(name):
                index[key].append(osm)
    return {key: dedupe_relations(rows) for key, rows in index.items()}


def match_unique(name: str, index):
    candidate_by_id = {}
    for key in keys(name):
        for candidate in index.get(key, []):
            candidate_by_id[int(candidate["relationId"])] = candidate
    candidates = list(candidate_by_id.values())
    if len(candidates) == 1:
        return "exact_alias", candidates[0]
    if len(candidates) > 1:
        return "ambiguous", None
    return "unmatched", None


def main():
    hcp_entities, hcp_urban = hcp_entities_and_urban()
    barid = base.extract_barid()
    osm_rows, metadata_endpoint = base.fetch_osm_admin8_metadata()
    osm_index = relation_index(osm_rows)

    hcp_matches = []
    for entity in hcp_urban:
        status, candidate = match_unique(entity["name"], osm_index)
        hcp_matches.append({
            **entity,
            "osmMatchStatus": status,
            "osmRelationId": candidate.get("relationId") if candidate else None,
            "osmNames": candidate.get("names") if candidate else [],
            "center": candidate.get("center") if candidate else None,
        })

    barid_cities = sorted({row["city"] for row in barid})
    postal_matches = []
    relation_ids = []
    for city in barid_cities:
        status, candidate = match_unique(city, osm_index)
        if candidate:
            relation_ids.append(int(candidate["relationId"]))
        postal_matches.append({
            "baridCity": city,
            "normalizedName": base.norm(city),
            "osmMatchStatus": status,
            "osmRelationId": candidate.get("relationId") if candidate else None,
            "osmNames": candidate.get("names") if candidate else [],
            "center": candidate.get("center") if candidate else None,
        })

    geometries, geometry_endpoint = base.fetch_geometries(sorted(set(relation_ids)))
    features = []
    for match in postal_matches:
        relation_id = match.get("osmRelationId")
        geometry = geometries.get(int(relation_id)) if relation_id else None
        if not geometry:
            continue
        features.append({
            "type": "Feature",
            "properties": {
                "city": match["baridCity"],
                "cityNormalized": match["normalizedName"],
                "osmRelationId": relation_id,
                "sourceUrl": f"https://www.openstreetmap.org/relation/{relation_id}",
                "licenseId": "ODbL-1.0",
                "licenseUrl": "https://www.openstreetmap.org/copyright",
                "attribution": "© OpenStreetMap contributors",
                "publicationStatus": "candidate",
                "officialBoundaryClaim": False,
            },
            "geometry": geometry,
        })

    unique_pairs = sorted({(row["city"], row["district"]) for row in barid})
    neighborhood_counts = defaultdict(int)
    for city, _district in unique_pairs:
        neighborhood_counts[city] += 1

    report = {
        "ok": True,
        "sources": {
            "hcp": {"url": base.HCP_XLSX, "year": 2024, "entityCount": len(hcp_entities), "urbanMunicipalityCount": len(hcp_urban)},
            "barid": {"url": base.BARID_XLSX, "license": "ODbL-1.0", "rowCount": len(barid), "cityCount": len(barid_cities), "uniqueCityDistrictPairs": len(unique_pairs)},
            "osm": {"license": "ODbL-1.0", "adminLevel": 8, "admin8RelationCount": len(osm_rows), "metadataEndpoint": metadata_endpoint, "geometryEndpoint": geometry_endpoint},
        },
        "matching": {
            "hcpUrbanToOsmMatched": sum(1 for row in hcp_matches if row["osmMatchStatus"] == "exact_alias"),
            "hcpUrbanToOsmAmbiguous": sum(1 for row in hcp_matches if row["osmMatchStatus"] == "ambiguous"),
            "hcpUrbanToOsmUnmatched": sum(1 for row in hcp_matches if row["osmMatchStatus"] == "unmatched"),
            "baridCitiesToOsmMatched": sum(1 for row in postal_matches if row["osmMatchStatus"] == "exact_alias"),
            "baridCitiesToOsmAmbiguous": sum(1 for row in postal_matches if row["osmMatchStatus"] == "ambiguous"),
            "baridCitiesToOsmUnmatched": sum(1 for row in postal_matches if row["osmMatchStatus"] == "unmatched"),
            "baridCitiesWithAssembledGeometry": len(features),
        },
        "postalCityMatches": postal_matches,
        "neighborhoodCounts": dict(sorted(neighborhood_counts.items())),
    }

    (OUT / "hcp-urban-municipalities.json").write_text(json.dumps(hcp_matches, ensure_ascii=False, indent=2))
    (OUT / "barid-neighborhoods.json").write_text(json.dumps(barid, ensure_ascii=False, indent=2))
    (OUT / "postal-city-matches.json").write_text(json.dumps(postal_matches, ensure_ascii=False, indent=2))
    (OUT / "osm-admin8-candidates.json").write_text(json.dumps(osm_rows, ensure_ascii=False, indent=2))
    (OUT / "postal-city-boundaries.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False))
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))

    if len(hcp_urban) < 100:
        raise SystemExit(f"unexpectedly low HCP urban municipality count: {len(hcp_urban)}")
    if report["matching"]["baridCitiesToOsmMatched"] < 30:
        raise SystemExit("fewer than 30/34 postal cities matched exactly/explicit-alias to OSM")
    if report["matching"]["baridCitiesWithAssembledGeometry"] < 25:
        raise SystemExit("fewer than 25 postal city geometries assembled")


if __name__ == "__main__":
    main()
