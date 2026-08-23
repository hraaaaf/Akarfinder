#!/usr/bin/env python3
"""Build AkarFinder's national territorial discovery catalog.

Doctrine:
- HCP RGPH 2024 is the official territorial spine.
- Barid Al-Maghrib provides open postal city/locality/neighborhood labels.
- OpenStreetMap provides open place coordinates and candidate admin boundaries.
- No fuzzy identity joins. Only exact normalized names plus a tiny explicit alias table.
- OSM boundaries are never called official boundaries. They remain sourced candidates.
- Postal neighborhoods are discovery labels, not authoritative polygons.
"""

from __future__ import annotations

import importlib.util
import json
import re
from collections import defaultdict
from pathlib import Path

BASE_PATH = Path(__file__).with_name("build-morocco-territory-registry.py")
spec = importlib.util.spec_from_file_location("territory_base", BASE_PATH)
base = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(base)

OUT = Path("data/audits/morocco-territory-registry-v3")
OUT.mkdir(parents=True, exist_ok=True)

BARID_LOCALITIES_XLSX = "https://data.gov.ma/data/dataset/c90aaa8f-5ad0-41d3-a9d2-f8f87ec538e0/resource/3aa9c2ce-bd68-4f91-86af-d4eeb3b8e6d1/download/codes-postaux-localites-2018.xlsx"
BARID_CITIES_XLSX = "https://data.gov.ma/data/dataset/c90aaa8f-5ad0-41d3-a9d2-f8f87ec538e0/resource/a42d7771-ec9d-4124-b631-c9177031432e/download/codes-postaux-des-villes-2018.xlsx"

EXPLICIT_ALIASES = {
    "mohammadia": "mohammedia",
    "ouezzane": "ouazzane",
    "eljadida": "el jadida",
    "beni mellal": "beni mellal",
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
    sheets = base.parse_xlsx(base.fetch_bytes(base.HCP_XLSX), "hcp-rgph2024-v3.xlsx")
    sheet = max(sheets, key=lambda item: len(item["rows"]))
    entities = []
    urban_municipalities = []
    urban_centers = []
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
        if entity_type == "urban_center":
            urban_centers.append(entity)
    return entities, urban_municipalities, urban_centers


def normalize_header(value: str) -> str:
    return base.norm(value).replace(" ", "_")


def find_header(rows, required_tokens):
    for index, row in enumerate(rows[:30]):
        normalized = [normalize_header(cell) for cell in row]
        joined = "|".join(normalized)
        if all(any(token in cell for cell in normalized) or token in joined for token in required_tokens):
            return index, normalized
    return None, []


def parse_table(url: str, tmp_name: str, required_tokens):
    sheets = base.parse_xlsx(base.fetch_bytes(url), tmp_name)
    sheet = max(sheets, key=lambda item: len(item["rows"]))
    header_index, normalized_header = find_header(sheet["rows"], required_tokens)
    if header_index is None:
        raise RuntimeError(f"header not found for {url}; preview={sheet['rows'][:10]!r}")
    return sheet["rows"], header_index, normalized_header


def find_column(header, tokens):
    for index, value in enumerate(header):
        if any(token in value for token in tokens):
            return index
    return None


def read_barid_localities():
    rows, header_index, header = parse_table(
        BARID_LOCALITIES_XLSX,
        "barid-localities-v3.xlsx",
        ["local", "province"],
    )
    locality_col = find_column(header, ["localite", "locality", "local"])
    province_col = find_column(header, ["province", "prefecture"])
    postal_col = find_column(header, ["code_postal", "postal"])
    if locality_col is None:
        raise RuntimeError(f"locality column missing: {header}")
    result = []
    for row in rows[header_index + 1:]:
        locality = row[locality_col].strip() if locality_col < len(row) else ""
        province = row[province_col].strip() if province_col is not None and province_col < len(row) else ""
        postal = row[postal_col].strip() if postal_col is not None and postal_col < len(row) else ""
        if locality:
            result.append({
                "locality": locality,
                "normalizedName": base.norm(locality),
                "province": province,
                "postalCode": postal,
            })
    return result, header


def read_barid_cities():
    rows, header_index, header = parse_table(
        BARID_CITIES_XLSX,
        "barid-cities-v3.xlsx",
        ["ville"],
    )
    city_col = find_column(header, ["ville"])
    postal_col = find_column(header, ["code_postal", "postal"])
    if city_col is None:
        raise RuntimeError(f"city column missing: {header}")
    result = []
    for row in rows[header_index + 1:]:
        city = row[city_col].strip() if city_col < len(row) else ""
        postal = row[postal_col].strip() if postal_col is not None and postal_col < len(row) else ""
        if city:
            result.append({"city": city, "normalizedName": base.norm(city), "postalCode": postal})
    return result, header


def osm_names(tags):
    fields = ["name", "name:fr", "name:en", "official_name", "short_name"]
    return sorted({str(tags.get(field, "")).strip() for field in fields if str(tags.get(field, "")).strip()})


def fetch_osm_places():
    query = """[out:json][timeout:180];
area[\"ISO3166-1\"=\"MA\"][admin_level=2]->.ma;
nwr(area.ma)[\"place\"~\"^(city|town)$\"];
out tags center;"""
    payload, endpoint = base.overpass(query)
    rows = []
    for element in payload.get("elements", []):
        tags = element.get("tags", {})
        names = osm_names(tags)
        if not names:
            continue
        center = element.get("center") or {}
        if element.get("type") == "node":
            center = {"lat": element.get("lat"), "lon": element.get("lon")}
        rows.append({
            "osmType": element.get("type"),
            "osmId": element.get("id"),
            "place": tags.get("place"),
            "names": names,
            "normalizedNames": sorted({key for name in names for key in normalized_keys(name)}),
            "wikidata": tags.get("wikidata"),
            "center": {"lat": center.get("lat"), "lng": center.get("lon")},
        })
    return rows, endpoint


def fetch_osm_boundaries():
    query = """[out:json][timeout:240];
area[\"ISO3166-1\"=\"MA\"][admin_level=2]->.ma;
relation(area.ma)[\"boundary\"=\"administrative\"][\"admin_level\"~\"^(8|9)$\"];
out tags center;"""
    payload, endpoint = base.overpass(query, timeout=300)
    rows = []
    for element in payload.get("elements", []):
        tags = element.get("tags", {})
        names = osm_names(tags)
        if not names:
            continue
        center = element.get("center") or {}
        rows.append({
            "relationId": element.get("id"),
            "adminLevel": tags.get("admin_level"),
            "names": names,
            "normalizedNames": sorted({key for name in names for key in normalized_keys(name)}),
            "wikidata": tags.get("wikidata"),
            "center": {"lat": center.get("lat"), "lng": center.get("lon")},
        })
    return rows, endpoint


def unique_index(rows, name_field="normalizedNames"):
    index = defaultdict(dict)
    for row in rows:
        identity = f"{row.get('osmType','relation')}:{row.get('osmId', row.get('relationId'))}"
        for key in row.get(name_field, []):
            index[key][identity] = row
    return {key: list(items.values()) for key, items in index.items()}


def match_unique(name: str, index):
    candidates = {}
    for key in normalized_keys(name):
        for candidate in index.get(key, []):
            identity = f"{candidate.get('osmType','relation')}:{candidate.get('osmId', candidate.get('relationId'))}"
            candidates[identity] = candidate
    values = list(candidates.values())
    if len(values) == 1:
        return "exact_alias", values[0]
    if len(values) > 1:
        return "ambiguous", None
    return "unmatched", None


def chunked(values, size=35):
    for index in range(0, len(values), size):
        yield values[index:index + size]


def fetch_boundary_geometries(ids):
    geometries = {}
    endpoints = []
    for batch in chunked(sorted(set(ids))):
        result, endpoint = base.fetch_geometries(batch)
        geometries.update(result)
        if endpoint:
            endpoints.append(endpoint)
    return geometries, sorted(set(endpoints))


def merge_place_candidate(registry, name, source_kind, payload):
    normalized = base.norm(name)
    if not normalized:
        return
    row = registry.setdefault(normalized, {
        "name": name,
        "normalizedName": normalized,
        "sources": [],
        "hcp": [],
        "barid": [],
        "osmPlace": None,
        "boundary": None,
    })
    if source_kind not in row["sources"]:
        row["sources"].append(source_kind)
    if source_kind.startswith("hcp"):
        row["name"] = name
        row["hcp"].append(payload)
    elif source_kind.startswith("barid"):
        row["barid"].append(payload)
    elif source_kind == "osm_place" and row["osmPlace"] is None:
        row["osmPlace"] = payload


def main():
    hcp_entities, hcp_urban, hcp_centers = read_hcp()
    neighborhoods = base.extract_barid()
    localities, locality_header = read_barid_localities()
    postal_cities, city_header = read_barid_cities()
    osm_places, osm_place_endpoint = fetch_osm_places()
    osm_boundaries, osm_boundary_endpoint = fetch_osm_boundaries()

    place_registry = {}
    for row in hcp_urban:
        merge_place_candidate(place_registry, row["name"], "hcp_urban_municipality", row)
    for row in hcp_centers:
        merge_place_candidate(place_registry, row["name"], "hcp_urban_center", row)
    for row in postal_cities:
        merge_place_candidate(place_registry, row["city"], "barid_city", row)
    for row in osm_places:
        primary = row["names"][0]
        merge_place_candidate(place_registry, primary, "osm_place", row)

    place_index = unique_index(osm_places)
    boundary_index = unique_index(osm_boundaries)
    matched_boundary_ids = []

    for row in place_registry.values():
        place_status, place_match = match_unique(row["name"], place_index)
        boundary_status, boundary_match = match_unique(row["name"], boundary_index)
        if place_match:
            row["osmPlace"] = place_match
        row["placeMatchStatus"] = place_status
        row["boundaryMatchStatus"] = boundary_status
        if boundary_match:
            relation_id = int(boundary_match["relationId"])
            matched_boundary_ids.append(relation_id)
            row["boundary"] = {
                "relationId": relation_id,
                "adminLevel": boundary_match.get("adminLevel"),
                "names": boundary_match.get("names", []),
                "sourceUrl": f"https://www.openstreetmap.org/relation/{relation_id}",
                "licenseId": "ODbL-1.0",
                "licenseUrl": "https://www.openstreetmap.org/copyright",
                "attribution": "© OpenStreetMap contributors",
                "officialBoundaryClaim": False,
                "publicationStatus": "candidate",
            }
        row["displayEligible"] = bool(row["hcp"] or row["barid"] or row["osmPlace"])
        row["confidence"] = "official_hcp" if row["hcp"] else ("postal_barid" if row["barid"] else "osm_open_map")

    geometries, geometry_endpoints = fetch_boundary_geometries(matched_boundary_ids)
    boundary_features = []
    for row in place_registry.values():
        boundary = row.get("boundary")
        if not boundary:
            continue
        geometry = geometries.get(int(boundary["relationId"]))
        if not geometry:
            continue
        boundary_features.append({
            "type": "Feature",
            "properties": {
                "name": row["name"],
                "normalizedName": row["normalizedName"],
                **boundary,
            },
            "geometry": geometry,
        })

    unique_neighborhoods = {}
    for row in neighborhoods:
        key = (base.norm(row["city"]), base.norm(row["district"]))
        unique_neighborhoods.setdefault(key, {
            **row,
            "sourceKind": "barid_postal_neighborhood",
            "boundaryStatus": "not_claimed",
            "publicationStatus": "label_candidate",
        })

    official_places = [row for row in place_registry.values() if row["hcp"]]
    report = {
        "ok": True,
        "sources": {
            "hcp": {
                "url": base.HCP_XLSX,
                "year": 2024,
                "entityCount": len(hcp_entities),
                "urbanMunicipalityCount": len(hcp_urban),
                "urbanCenterCount": len(hcp_centers),
            },
            "baridNeighborhoods": {
                "url": base.BARID_XLSX,
                "license": "ODbL-1.0",
                "rawRowCount": len(neighborhoods),
                "uniqueCityDistrictPairs": len(unique_neighborhoods),
                "cityCount": len({base.norm(row["city"]) for row in neighborhoods}),
            },
            "baridLocalities": {
                "url": BARID_LOCALITIES_XLSX,
                "license": "ODbL-1.0",
                "rowCount": len(localities),
                "uniqueLocalityCount": len({row["normalizedName"] for row in localities}),
                "header": locality_header,
            },
            "baridCities": {
                "url": BARID_CITIES_XLSX,
                "license": "ODbL-1.0",
                "rowCount": len(postal_cities),
                "uniqueCityCount": len({row["normalizedName"] for row in postal_cities}),
                "header": city_header,
            },
            "osm": {
                "license": "ODbL-1.0",
                "placeCityTownCount": len(osm_places),
                "admin8or9BoundaryCount": len(osm_boundaries),
                "placeEndpoint": osm_place_endpoint,
                "boundaryEndpoint": osm_boundary_endpoint,
                "geometryEndpoints": geometry_endpoints,
            },
        },
        "catalog": {
            "placeCandidateCount": len(place_registry),
            "officialHcpPlaceCount": len(official_places),
            "placeWithCoordinateCount": sum(1 for row in place_registry.values() if row.get("osmPlace") and row["osmPlace"].get("center", {}).get("lat") is not None),
            "placeWithUniqueBoundaryMatchCount": sum(1 for row in place_registry.values() if row.get("boundary")),
            "placeWithAssembledBoundaryCount": len(boundary_features),
            "postalNeighborhoodCandidateCount": len(unique_neighborhoods),
        },
        "coverage": {
            "officialHcpPlacesWithCoordinates": sum(1 for row in official_places if row.get("osmPlace") and row["osmPlace"].get("center", {}).get("lat") is not None),
            "officialHcpPlacesWithBoundary": sum(1 for row in official_places if row.get("boundary")),
            "officialHcpPlacesWithoutCoordinate": [row["name"] for row in official_places if not row.get("osmPlace") or row["osmPlace"].get("center", {}).get("lat") is None],
            "officialHcpPlacesWithoutBoundary": [row["name"] for row in official_places if not row.get("boundary")],
        },
    }

    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    (OUT / "places.json").write_text(json.dumps(sorted(place_registry.values(), key=lambda row: row["normalizedName"]), ensure_ascii=False, indent=2))
    (OUT / "barid-localities.json").write_text(json.dumps(localities, ensure_ascii=False, indent=2))
    (OUT / "neighborhood-candidates.json").write_text(json.dumps(sorted(unique_neighborhoods.values(), key=lambda row: (base.norm(row["city"]), base.norm(row["district"]))), ensure_ascii=False, indent=2))
    (OUT / "city-boundary-candidates.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": boundary_features}, ensure_ascii=False))

    if len(hcp_urban) < 100:
        raise SystemExit(f"unexpected HCP urban municipality count: {len(hcp_urban)}")
    if len(hcp_centers) < 20:
        raise SystemExit(f"unexpected HCP urban-center count: {len(hcp_centers)}")
    if len(unique_neighborhoods) < 9000:
        raise SystemExit(f"unexpected postal neighborhood count: {len(unique_neighborhoods)}")
    if len(osm_places) < 100:
        raise SystemExit(f"unexpected OSM city/town count: {len(osm_places)}")
    if len(place_registry) < 150:
        raise SystemExit(f"unexpected combined place count: {len(place_registry)}")


if __name__ == "__main__":
    main()
