#!/usr/bin/env python3
"""V5 national territorial catalog.

City/town semantics come from the Geofabrik/OpenStreetMap `place=city|town`
extract. HCP RGPH 2024 enriches an OSM place only on a unique exact/explicit-
alias name match. This avoids inferring an urban/rural classification from HCP
geographic-code formatting. Barid adds postal city/neighborhood discovery
labels. No fuzzy identity joins and no synthetic boundaries.
"""

from __future__ import annotations

import importlib.util
import json
from collections import defaultdict
from pathlib import Path

V4_PATH = Path(__file__).with_name("build-morocco-territory-registry-v4.py")
spec = importlib.util.spec_from_file_location("territory_v4", V4_PATH)
v4 = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(v4)
base = v4.base

OUT = Path("data/audits/morocco-territory-registry-v5")
OUT.mkdir(parents=True, exist_ok=True)


def hcp_index(rows):
    index = defaultdict(dict)
    for row in rows:
        for key in v4.normalized_keys(row["name"]):
            index[key][row["code"]] = row
    return {key: list(values.values()) for key, values in index.items()}


def match_hcp_from_names(names, index):
    candidates = {}
    for name in names:
        for key in v4.normalized_keys(name):
            for row in index.get(key, []):
                candidates[row["code"]] = row
    values = list(candidates.values())
    if len(values) == 1:
        return "exact_alias", values[0]
    if len(values) > 1:
        return "ambiguous", None
    return "unmatched", None


def match_osm_from_names(names, index, id_field):
    candidates = {}
    for name in names:
        for key in v4.normalized_keys(name):
            for row in index.get(key, []):
                candidates[str(row.get(id_field))] = row
    values = list(candidates.values())
    if len(values) == 1:
        return "exact_alias", values[0]
    if len(values) > 1:
        return "ambiguous", None
    return "unmatched", None


def preferred_name(names):
    latin = [name for name in names if any("a" <= ch.lower() <= "z" for ch in name)]
    pool = latin or names
    return min(pool, key=lambda value: (len(value), value.lower()))


def main():
    hcp_entities, _unused, hcp_centers = v4.read_hcp()
    hcp_communes = [row for row in hcp_entities if row["type"] == "commune"]
    hcp_refs = [*hcp_communes, *hcp_centers]
    hcp_by_name = hcp_index(hcp_refs)

    barid_rows = base.extract_barid()
    barid_city_names = sorted({row["city"] for row in barid_rows})
    osm_places = v4.parse_osm_places()
    osm_boundaries = v4.parse_osm_boundaries()
    osm_neighborhoods = v4.parse_osm_neighborhoods()
    boundary_index = v4.unique_index(osm_boundaries)
    boundary_by_relation = {row["relationId"]: row for row in osm_boundaries}

    places = []
    used_hcp_codes = set()
    used_barid = set()
    boundary_features_by_relation = {}

    for osm in osm_places:
        hcp_status, hcp = match_hcp_from_names(osm["names"], hcp_by_name)
        display_name = hcp["name"] if hcp else preferred_name(osm["names"])
        boundary_status, boundary = match_osm_from_names([display_name, *osm["names"]], boundary_index, "relationId")
        if hcp:
            used_hcp_codes.add(hcp["code"])
        for city in barid_city_names:
            if v4.normalized_keys(city) & {key for name in [display_name, *osm["names"]] for key in v4.normalized_keys(name)}:
                used_barid.add(base.norm(city))

        place = {
            "id": f"hcp:{hcp['code']}" if hcp else f"osm:{osm.get('osmType')}:{osm.get('osmId')}",
            "name": display_name,
            "normalizedName": base.norm(display_name),
            "sourceKind": (
                "hcp_commune_osm_citytown" if hcp and hcp["type"] == "commune"
                else "hcp_urban_center_osm_citytown" if hcp
                else "osm_city_town"
            ),
            "hcp": hcp,
            "osmPlace": osm,
            "hcpMatchStatus": hcp_status,
            "boundaryMatchStatus": boundary_status,
            "center": osm["center"],
            "confidence": "official_hcp" if hcp else "osm_open_map",
            "boundary": None,
        }
        if boundary:
            place["boundary"] = {
                "relationId": boundary["relationId"],
                "adminLevel": boundary["adminLevel"],
                "sourceUrl": f"https://www.openstreetmap.org/relation/{boundary['relationId']}",
                "licenseId": "ODbL-1.0",
                "licenseUrl": "https://www.openstreetmap.org/copyright",
                "attribution": "© OpenStreetMap contributors",
                "officialBoundaryClaim": False,
                "publicationStatus": "candidate",
            }
            existing = boundary_features_by_relation.get(boundary["relationId"])
            feature = {
                "type": "Feature",
                "properties": {
                    "placeId": place["id"],
                    "name": display_name,
                    "normalizedName": place["normalizedName"],
                    **place["boundary"],
                },
                "geometry": boundary["geometry"],
            }
            if not existing or place["confidence"] == "official_hcp":
                boundary_features_by_relation[boundary["relationId"]] = feature
        places.append(place)

    # Preserve HCP urban centres that OSM does not tag city/town. They remain
    # label/boundary candidates, not promoted to `city` by invention.
    for hcp in hcp_centers:
        if hcp["code"] in used_hcp_codes:
            continue
        boundary_status, boundary = v4.match_unique(hcp["name"], boundary_index)
        center = v4.feature_center({"geometry": boundary["geometry"]}) if boundary else None
        place = {
            "id": f"hcp:{hcp['code']}",
            "name": hcp["name"],
            "normalizedName": hcp["normalizedName"],
            "sourceKind": "hcp_urban_center",
            "hcp": hcp,
            "osmPlace": None,
            "hcpMatchStatus": "source",
            "boundaryMatchStatus": boundary_status,
            "center": center,
            "confidence": "official_hcp",
            "boundary": None,
        }
        if boundary:
            place["boundary"] = {
                "relationId": boundary["relationId"],
                "adminLevel": boundary["adminLevel"],
                "sourceUrl": f"https://www.openstreetmap.org/relation/{boundary['relationId']}",
                "licenseId": "ODbL-1.0",
                "licenseUrl": "https://www.openstreetmap.org/copyright",
                "attribution": "© OpenStreetMap contributors",
                "officialBoundaryClaim": False,
                "publicationStatus": "candidate",
            }
            boundary_features_by_relation.setdefault(boundary["relationId"], {
                "type": "Feature",
                "properties": {"placeId": place["id"], "name": hcp["name"], "normalizedName": hcp["normalizedName"], **place["boundary"]},
                "geometry": boundary["geometry"],
            })
        places.append(place)

    # Postal city names are retained even without a coordinate. The product will
    # only place them on the map when a coordinate or boundary is qualified.
    existing_name_keys = {key for place in places for key in v4.normalized_keys(place["name"])}
    for city in barid_city_names:
        normalized = base.norm(city)
        if normalized in used_barid or v4.normalized_keys(city) & existing_name_keys:
            continue
        places.append({
            "id": f"barid:{normalized}",
            "name": city,
            "normalizedName": normalized,
            "sourceKind": "barid_postal_city",
            "hcp": None,
            "osmPlace": None,
            "hcpMatchStatus": "unmatched",
            "boundaryMatchStatus": "unmatched",
            "center": None,
            "confidence": "postal_barid",
            "boundary": None,
        })

    boundary_features = list(boundary_features_by_relation.values())

    neighborhood_map = {}
    for row in barid_rows:
        key = (base.norm(row["city"]), base.norm(row["district"]))
        target = neighborhood_map.setdefault(key, {
            "id": f"barid:{key[0]}:{key[1]}",
            "name": row["district"],
            "normalizedName": key[1],
            "parentCity": row["city"],
            "parentCityNormalized": key[0],
            "center": None,
            "sourceKinds": ["barid_postal_neighborhood"],
            "postalCodes": [],
            "boundaryStatus": "not_claimed",
            "publicationStatus": "label_candidate",
        })
        postal = row.get("postalCode")
        if postal and postal not in target["postalCodes"]:
            target["postalCodes"].append(postal)

    containers = [(f["properties"]["name"], f["properties"]["normalizedName"], f["geometry"]) for f in boundary_features]
    osm_parented = 0
    for row in osm_neighborhoods:
        containing = [(name, norm) for name, norm, geometry in containers if v4.point_in_geometry(row["center"], geometry)]
        parent = containing[0] if len(containing) == 1 else None
        if parent:
            osm_parented += 1
        key = (parent[1] if parent else "", row["normalizedName"], str(row.get("osmId")))
        neighborhood_map.setdefault(key, {
            "id": f"osm:{row.get('osmType')}:{row.get('osmId')}",
            "name": row["name"],
            "normalizedName": row["normalizedName"],
            "parentCity": parent[0] if parent else None,
            "parentCityNormalized": parent[1] if parent else None,
            "center": row["center"],
            "sourceKinds": ["osm_neighborhood_label"],
            "postalCodes": [],
            "boundaryStatus": "not_claimed",
            "publicationStatus": "label_candidate",
        })

    neighborhoods = list(neighborhood_map.values())
    report = {
        "ok": True,
        "sources": {
            "hcp": {
                "url": base.HCP_XLSX,
                "year": 2024,
                "entityCount": len(hcp_entities),
                "communeCount": len(hcp_communes),
                "urbanCenterCount": len(hcp_centers),
            },
            "barid": {
                "url": base.BARID_XLSX,
                "license": "ODbL-1.0",
                "rawRowCount": len(barid_rows),
                "cityCount": len(barid_city_names),
            },
            "osm": {
                "extract": v4.GEofABRIK_URL,
                "license": "ODbL-1.0",
                "cityTownFeatureCount": len(osm_places),
                "admin8or9BoundaryCount": len(osm_boundaries),
                "neighborhoodFeatureCount": len(osm_neighborhoods),
            },
        },
        "catalog": {
            "placeCandidateCount": len(places),
            "osmCityTownWithUniqueHcpMatchCount": sum(1 for row in places if row.get("osmPlace") and row.get("hcp")),
            "placeWithCoordinateCount": sum(1 for row in places if row.get("center")),
            "placeWithBoundaryCount": len(boundary_features),
            "neighborhoodCandidateCount": len(neighborhoods),
            "baridNeighborhoodCandidateCount": sum(1 for row in neighborhoods if "barid_postal_neighborhood" in row["sourceKinds"]),
            "osmNeighborhoodCandidateCount": sum(1 for row in neighborhoods if "osm_neighborhood_label" in row["sourceKinds"]),
            "osmNeighborhoodWithUniqueParentBoundaryCount": osm_parented,
        },
    }

    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    (OUT / "places.json").write_text(json.dumps(places, ensure_ascii=False, indent=2))
    (OUT / "neighborhoods.json").write_text(json.dumps(neighborhoods, ensure_ascii=False, indent=2))
    (OUT / "city-boundaries.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": boundary_features}, ensure_ascii=False))

    if len(hcp_communes) < 1000:
        raise SystemExit(f"unexpected HCP commune count: {len(hcp_communes)}")
    if len(hcp_centers) < 100:
        raise SystemExit(f"unexpected HCP urban-center count: {len(hcp_centers)}")
    if len(osm_places) < 300:
        raise SystemExit(f"unexpected OSM city/town count: {len(osm_places)}")
    if len(places) < 350:
        raise SystemExit(f"unexpected place catalog size: {len(places)}")
    if len(boundary_features) < 250:
        raise SystemExit(f"unexpected assembled boundary count: {len(boundary_features)}")
    if len(neighborhoods) < 10000:
        raise SystemExit(f"unexpected neighborhood catalog size: {len(neighborhoods)}")


if __name__ == "__main__":
    main()
