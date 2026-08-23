#!/usr/bin/env python3
"""Build the national AkarFinder territorial discovery catalog from reproducible sources.

Inputs:
- HCP RGPH 2024: official territorial spine.
- Barid Al-Maghrib: postal neighborhood labels (ODbL).
- Geofabrik Morocco OSM extract pre-filtered by the workflow with Osmium.

Safety:
- no fuzzy joins;
- exact normalized names + tiny explicit alias table only;
- OSM boundaries are sourced candidates, never claimed as official;
- postal/OSM neighborhood labels do not become polygons by inference;
- missing geometry falls back to a label/point in the product.
"""

from __future__ import annotations

import importlib.util
import json
import math
import re
from collections import defaultdict
from pathlib import Path

BASE_PATH = Path(__file__).with_name("build-morocco-territory-registry.py")
spec = importlib.util.spec_from_file_location("territory_base", BASE_PATH)
base = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(base)

OUT = Path("data/audits/morocco-territory-registry-v4")
OUT.mkdir(parents=True, exist_ok=True)

OSM_PLACES = Path("/tmp/osm-places.geojson")
OSM_BOUNDARIES = Path("/tmp/osm-boundaries.geojson")
OSM_NEIGHBORHOODS = Path("/tmp/osm-neighborhoods.geojson")
GEofABRIK_URL = "https://download.geofabrik.de/africa/morocco-latest.osm.pbf"

EXPLICIT_ALIASES = {
    "mohammadia": "mohammedia",
    "ouezzane": "ouazzane",
    "eljadida": "el jadida",
}


def normalized_keys(value: str) -> set[str]:
    key = base.norm(value)
    compact = key.replace(" ", "")
    alias = EXPLICIT_ALIASES.get(key, "")
    return {item for item in (key, compact, alias, alias.replace(" ", "") if alias else "") if item}


def strip_hcp_prefix(name: str) -> str:
    value = re.sub(r"^Commune\s+(?:de|d')\s*", "", name, flags=re.I).strip()
    value = re.sub(r"^dont\s+le\s+centre\s+urbain\s+(?:de|d')\s*", "", value, flags=re.I).strip()
    return value


def read_hcp():
    sheets = base.parse_xlsx(base.fetch_bytes(base.HCP_XLSX), "hcp-rgph2024-v4.xlsx")
    sheet = max(sheets, key=lambda item: len(item["rows"]))
    entities, urban_municipalities, urban_centers = [], [], []
    for row in sheet["rows"]:
        if len(row) < 7:
            continue
        raw_name = row[0].strip()
        code = row[6].strip()
        if not raw_name or not code:
            continue
        entity_type = None
        if raw_name.startswith(("Région de ", "Région d'")):
            entity_type = "region"
        elif raw_name.startswith(("Préfecture de ", "Préfecture d'", "Province de ", "Province d'")):
            entity_type = "province_prefecture"
        elif raw_name.startswith(("Arrondissement de ", "Arrondissement d'")):
            entity_type = "arrondissement"
        elif raw_name.startswith(("Commune de ", "Commune d'")):
            entity_type = "commune"
        elif raw_name.startswith(("Cercle de ", "Cercle d'")):
            entity_type = "cercle"
        elif raw_name.lower().startswith("dont le centre urbain"):
            entity_type = "urban_center"
        if not entity_type:
            continue
        display_name = strip_hcp_prefix(raw_name)
        entity = {
            "name": display_name,
            "rawName": raw_name,
            "normalizedName": base.norm(display_name),
            "code": code,
            "type": entity_type,
            "population": base.parse_int(row[3] if len(row) > 3 else ""),
            "households": base.parse_int(row[4] if len(row) > 4 else ""),
        }
        entities.append(entity)
        if entity_type == "commune" and re.match(r"^\d{1,2}\.\d{3}\.01(?:\.(?:0|\d{1,2}))?$", code):
            urban_municipalities.append(entity)
        elif entity_type == "urban_center":
            urban_centers.append(entity)
    return entities, urban_municipalities, urban_centers


def read_geojson(path: Path):
    payload = json.loads(path.read_text())
    return payload.get("features", []) if isinstance(payload, dict) else []


def feature_names(properties: dict) -> list[str]:
    fields = ["name", "name:fr", "name:en", "official_name", "short_name"]
    return sorted({str(properties.get(field, "")).strip() for field in fields if str(properties.get(field, "")).strip()})


def geometry_points(geometry):
    if not geometry:
        return []
    coords = geometry.get("coordinates")
    points = []
    def walk(value):
        if isinstance(value, list) and len(value) >= 2 and all(isinstance(x, (int, float)) for x in value[:2]):
            points.append((float(value[0]), float(value[1])))
            return
        if isinstance(value, list):
            for item in value:
                walk(item)
    walk(coords)
    return points


def feature_center(feature):
    geometry = feature.get("geometry") or {}
    if geometry.get("type") == "Point":
        coords = geometry.get("coordinates") or []
        if len(coords) >= 2:
            return {"lng": float(coords[0]), "lat": float(coords[1])}
    points = geometry_points(geometry)
    if not points:
        return None
    return {
        "lng": (min(p[0] for p in points) + max(p[0] for p in points)) / 2,
        "lat": (min(p[1] for p in points) + max(p[1] for p in points)) / 2,
    }


def osm_id(properties):
    value = properties.get("@id")
    try:
        return int(value)
    except Exception:
        return None


def parse_osm_places():
    rows = []
    for feature in read_geojson(OSM_PLACES):
        props = feature.get("properties") or {}
        place = props.get("place")
        if place not in ("city", "town"):
            continue
        names = feature_names(props)
        center = feature_center(feature)
        if not names or not center:
            continue
        rows.append({
            "osmType": props.get("@type"),
            "osmId": osm_id(props),
            "place": place,
            "names": names,
            "normalizedNames": sorted({key for name in names for key in normalized_keys(name)}),
            "wikidata": props.get("wikidata"),
            "center": center,
        })
    return rows


def parse_osm_boundaries():
    rows = []
    for feature in read_geojson(OSM_BOUNDARIES):
        props = feature.get("properties") or {}
        if props.get("boundary") != "administrative" or str(props.get("admin_level")) not in ("8", "9"):
            continue
        names = feature_names(props)
        relation_id = osm_id(props)
        geometry = feature.get("geometry")
        if not names or relation_id is None or not geometry or geometry.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        rows.append({
            "relationId": relation_id,
            "adminLevel": str(props.get("admin_level")),
            "names": names,
            "normalizedNames": sorted({key for name in names for key in normalized_keys(name)}),
            "wikidata": props.get("wikidata"),
            "geometry": geometry,
        })
    return rows


def parse_osm_neighborhoods():
    rows = []
    for feature in read_geojson(OSM_NEIGHBORHOODS):
        props = feature.get("properties") or {}
        place = props.get("place")
        if place not in ("neighbourhood", "suburb", "quarter", "borough"):
            continue
        names = feature_names(props)
        center = feature_center(feature)
        if not names or not center:
            continue
        rows.append({
            "name": names[0],
            "aliases": names[1:],
            "normalizedName": base.norm(names[0]),
            "place": place,
            "osmType": props.get("@type"),
            "osmId": osm_id(props),
            "center": center,
            "sourceKind": "osm_neighborhood_label",
            "sourceUrl": "https://www.openstreetmap.org/copyright",
            "licenseId": "ODbL-1.0",
            "boundaryStatus": "not_claimed",
        })
    return rows


def unique_index(rows, field="normalizedNames"):
    index = defaultdict(dict)
    for row in rows:
        identity = f"{row.get('osmType','relation')}:{row.get('osmId', row.get('relationId'))}"
        for key in row.get(field, []):
            index[key][identity] = row
    return {key: list(values.values()) for key, values in index.items()}


def match_unique(name: str, index):
    candidates = {}
    for key in normalized_keys(name):
        for row in index.get(key, []):
            identity = f"{row.get('osmType','relation')}:{row.get('osmId', row.get('relationId'))}"
            candidates[identity] = row
    values = list(candidates.values())
    if len(values) == 1:
        return "exact_alias", values[0]
    if len(values) > 1:
        return "ambiguous", None
    return "unmatched", None


def point_in_ring(point, ring):
    x, y = point
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        intersects = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-30) + xi)
        if intersects:
            inside = not inside
        j = i
    return inside


def point_in_geometry(center, geometry):
    point = (center["lng"], center["lat"])
    if geometry.get("type") == "Polygon":
        polygons = [geometry.get("coordinates") or []]
    elif geometry.get("type") == "MultiPolygon":
        polygons = geometry.get("coordinates") or []
    else:
        return False
    for polygon in polygons:
        if not polygon:
            continue
        if point_in_ring(point, polygon[0]) and not any(point_in_ring(point, hole) for hole in polygon[1:]):
            return True
    return False


def main():
    hcp_entities, hcp_urban, hcp_centers = read_hcp()
    barid_rows = base.extract_barid()
    osm_places = parse_osm_places()
    osm_boundaries = parse_osm_boundaries()
    osm_neighborhoods = parse_osm_neighborhoods()

    place_index = unique_index(osm_places)
    boundary_index = unique_index(osm_boundaries)
    hcp_name_counts = defaultdict(int)
    for row in [*hcp_urban, *hcp_centers]:
        hcp_name_counts[row["normalizedName"]] += 1

    places = []
    occupied_osm = set()
    occupied_barid_names = set()
    barid_city_names = sorted({row["city"] for row in barid_rows})

    for hcp in [*hcp_urban, *hcp_centers]:
        place_status, place_match = match_unique(hcp["name"], place_index)
        boundary_status, boundary_match = match_unique(hcp["name"], boundary_index)
        if place_match:
            occupied_osm.add((place_match.get("osmType"), place_match.get("osmId")))
        for city in barid_city_names:
            if normalized_keys(city) & normalized_keys(hcp["name"]):
                occupied_barid_names.add(base.norm(city))
        places.append({
            "id": f"hcp:{hcp['code']}",
            "name": hcp["name"],
            "normalizedName": hcp["normalizedName"],
            "sourceKind": "hcp_urban_municipality" if hcp["type"] == "commune" else "hcp_urban_center",
            "hcp": hcp,
            "osmPlace": place_match,
            "placeMatchStatus": place_status,
            "boundaryMatchStatus": boundary_status,
            "center": place_match.get("center") if place_match else None,
            "confidence": "official_hcp",
            "boundary": None if not boundary_match else {
                "relationId": boundary_match["relationId"],
                "adminLevel": boundary_match["adminLevel"],
                "sourceUrl": f"https://www.openstreetmap.org/relation/{boundary_match['relationId']}",
                "licenseId": "ODbL-1.0",
                "licenseUrl": "https://www.openstreetmap.org/copyright",
                "attribution": "© OpenStreetMap contributors",
                "officialBoundaryClaim": False,
                "publicationStatus": "candidate",
            },
        })

    for osm in osm_places:
        identity = (osm.get("osmType"), osm.get("osmId"))
        if identity in occupied_osm:
            continue
        name = osm["names"][0]
        boundary_status, boundary_match = match_unique(name, boundary_index)
        places.append({
            "id": f"osm:{osm.get('osmType')}:{osm.get('osmId')}",
            "name": name,
            "normalizedName": base.norm(name),
            "sourceKind": "osm_city_town",
            "hcp": None,
            "osmPlace": osm,
            "placeMatchStatus": "source",
            "boundaryMatchStatus": boundary_status,
            "center": osm["center"],
            "confidence": "osm_open_map",
            "boundary": None if not boundary_match else {
                "relationId": boundary_match["relationId"],
                "adminLevel": boundary_match["adminLevel"],
                "sourceUrl": f"https://www.openstreetmap.org/relation/{boundary_match['relationId']}",
                "licenseId": "ODbL-1.0",
                "licenseUrl": "https://www.openstreetmap.org/copyright",
                "attribution": "© OpenStreetMap contributors",
                "officialBoundaryClaim": False,
                "publicationStatus": "candidate",
            },
        })

    for city in barid_city_names:
        normalized = base.norm(city)
        if normalized in occupied_barid_names:
            continue
        if any(normalized_keys(city) & set(row.get("normalizedNames", [])) for row in osm_places):
            continue
        places.append({
            "id": f"barid:{normalized}",
            "name": city,
            "normalizedName": normalized,
            "sourceKind": "barid_postal_city",
            "hcp": None,
            "osmPlace": None,
            "placeMatchStatus": "unmatched",
            "boundaryMatchStatus": "unmatched",
            "center": None,
            "confidence": "postal_barid",
            "boundary": None,
        })

    boundary_by_relation = {row["relationId"]: row for row in osm_boundaries}
    boundary_features = []
    for place in places:
        boundary = place.get("boundary")
        if not boundary:
            continue
        source = boundary_by_relation.get(boundary["relationId"])
        if not source:
            continue
        boundary_features.append({
            "type": "Feature",
            "properties": {
                "placeId": place["id"],
                "name": place["name"],
                "normalizedName": place["normalizedName"],
                **boundary,
            },
            "geometry": source["geometry"],
        })

    # Postal labels retain their explicit Barid city parent. No geometry is inferred.
    neighborhood_map = {}
    for row in barid_rows:
        key = (base.norm(row["city"]), base.norm(row["district"]))
        neighborhood_map.setdefault(key, {
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
        if postal and postal not in neighborhood_map[key]["postalCodes"]:
            neighborhood_map[key]["postalCodes"].append(postal)

    # OSM neighborhood labels are added independently. Parent assignment is only
    # accepted when the point falls inside exactly one assembled city boundary.
    boundary_containers = [(f["properties"]["name"], f["properties"]["normalizedName"], f["geometry"]) for f in boundary_features]
    osm_parented = 0
    for row in osm_neighborhoods:
        containing = [(name, norm) for name, norm, geometry in boundary_containers if point_in_geometry(row["center"], geometry)]
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
            "hcp": {"url": base.HCP_XLSX, "year": 2024, "entityCount": len(hcp_entities), "urbanMunicipalityCount": len(hcp_urban), "urbanCenterCount": len(hcp_centers)},
            "barid": {"url": base.BARID_XLSX, "license": "ODbL-1.0", "rawRowCount": len(barid_rows), "cityCount": len(barid_city_names)},
            "osm": {"extract": GEofABRIK_URL, "license": "ODbL-1.0", "cityTownFeatureCount": len(osm_places), "admin8or9BoundaryCount": len(osm_boundaries), "neighborhoodFeatureCount": len(osm_neighborhoods)},
        },
        "catalog": {
            "placeCandidateCount": len(places),
            "officialHcpPlaceCount": sum(1 for row in places if row["hcp"]),
            "placeWithCoordinateCount": sum(1 for row in places if row.get("center")),
            "placeWithBoundaryCount": len(boundary_features),
            "neighborhoodCandidateCount": len(neighborhoods),
            "baridNeighborhoodCandidateCount": sum(1 for row in neighborhoods if "barid_postal_neighborhood" in row["sourceKinds"]),
            "osmNeighborhoodCandidateCount": sum(1 for row in neighborhoods if "osm_neighborhood_label" in row["sourceKinds"]),
            "osmNeighborhoodWithUniqueParentBoundaryCount": osm_parented,
        },
        "coverage": {
            "hcpPlacesWithoutCoordinate": [row["name"] for row in places if row["hcp"] and not row.get("center")],
            "hcpPlacesWithoutBoundary": [row["name"] for row in places if row["hcp"] and not row.get("boundary")],
        },
    }

    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    (OUT / "places.json").write_text(json.dumps(places, ensure_ascii=False, indent=2))
    (OUT / "neighborhoods.json").write_text(json.dumps(neighborhoods, ensure_ascii=False, indent=2))
    (OUT / "city-boundaries.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": boundary_features}, ensure_ascii=False))

    if len(hcp_urban) < 100:
        raise SystemExit(f"unexpected HCP urban municipality count: {len(hcp_urban)}")
    if len(osm_places) < 100:
        raise SystemExit(f"unexpected OSM city/town count: {len(osm_places)}")
    if len(places) < 150:
        raise SystemExit(f"unexpected place catalog size: {len(places)}")
    if len(neighborhoods) < 9000:
        raise SystemExit(f"unexpected neighborhood catalog size: {len(neighborhoods)}")
    if len(boundary_features) < 25:
        raise SystemExit(f"unexpected assembled city-boundary count: {len(boundary_features)}")


if __name__ == "__main__":
    main()
