#!/usr/bin/env python3
"""Build a high-precision Morocco territorial candidate registry.

Sources:
- HCP RGPH 2024: official territorial names/codes/population.
- Barid Al-Maghrib open data: postal neighborhood names by city.
- OpenStreetMap/Overpass: admin_level=8 relation candidates and geometry.

This script never fuzzily assigns a geometry. Exact normalized name matching only;
unmatched/ambiguous entities stay without polygon and must fall back to a label/point.
"""

from __future__ import annotations

import json
import math
import re
import time
import unicodedata
import urllib.parse
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

OUT = Path("data/audits/morocco-territory-registry")
OUT.mkdir(parents=True, exist_ok=True)

HCP_XLSX = "https://www.hcp.ma/file/242341/"
BARID_XLSX = "https://data.gov.ma/data/dataset/e0093dbf-38f0-440a-91da-ad3f0243f378/resource/7f257007-d512-4a2e-9f7f-ba29ee4ac8b1/download/codes-postaux-quartiers-2018.xlsx"
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
USER_AGENT = "AkarFinder territory registry audit/1.0 (+https://github.com/hraaaaf/Akarfinder)"


def fetch_bytes(url: str, timeout: int = 120, data: bytes | None = None) -> bytes:
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def overpass(query: str, timeout: int = 240):
    encoded = urllib.parse.urlencode({"data": query}).encode("utf-8")
    errors = []
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            return json.loads(fetch_bytes(endpoint, timeout=timeout, data=encoded).decode("utf-8")), endpoint
        except Exception as error:
            errors.append(f"{endpoint}: {error!r}")
            time.sleep(1)
    raise RuntimeError("all Overpass endpoints failed: " + " | ".join(errors))


def col_index(cell_ref: str) -> int:
    letters = re.match(r"([A-Z]+)", cell_ref or "A").group(1)
    value = 0
    for ch in letters:
        value = value * 26 + (ord(ch) - 64)
    return value - 1


def parse_xlsx(blob: bytes, tmp_name: str):
    tmp = Path("/tmp") / tmp_name
    tmp.write_bytes(blob)
    with zipfile.ZipFile(tmp) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            for si in root.findall("a:si", ns):
                shared.append("".join((t.text or "") for t in si.findall(".//a:t", ns)))
        workbook = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        ns = {
            "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
            "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
            "p": "http://schemas.openxmlformats.org/package/2006/relationships",
        }
        rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels.findall("p:Relationship", ns)}
        sheets = []
        for sheet in workbook.findall("a:sheets/a:sheet", ns):
            rid = sheet.attrib[f"{{{ns['r']}}}id"]
            target = rel_map[rid]
            if not target.startswith("xl/"):
                target = "xl/" + target.lstrip("/")
            xml = ET.fromstring(z.read(target))
            rows = []
            for row in xml.findall(".//a:sheetData/a:row", ns):
                values = []
                for cell in row.findall("a:c", ns):
                    idx = col_index(cell.attrib.get("r", "A1"))
                    while len(values) <= idx:
                        values.append("")
                    cell_type = cell.attrib.get("t")
                    v = cell.find("a:v", ns)
                    value = "" if v is None else (v.text or "")
                    if cell_type == "s" and value:
                        value = shared[int(value)]
                    elif cell_type == "inlineStr":
                        t = cell.find(".//a:t", ns)
                        value = "" if t is None else (t.text or "")
                    values[idx] = str(value).strip()
                if any(v for v in values):
                    rows.append(values)
            sheets.append({"name": sheet.attrib.get("name", "Sheet"), "rows": rows})
        return sheets


def norm(value: str) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.lower().replace("’", "'")
    text = re.sub(r"\b(commune|municipalite|municipalité|ville|de|du|des|d')\b", " ", text)
    text = re.sub(r"[^a-z0-9\u0600-\u06ff]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def parse_int(value: str) -> int | None:
    cleaned = re.sub(r"[^0-9]", "", str(value or ""))
    return int(cleaned) if cleaned else None


def extract_hcp():
    sheets = parse_xlsx(fetch_bytes(HCP_XLSX), "hcp-territory.xlsx")
    sheet = max(sheets, key=lambda item: len(item["rows"]))
    entities = []
    for row in sheet["rows"]:
        if len(row) < 7:
            continue
        name = row[0].strip()
        code = row[6].strip()
        if not name or not code:
            continue
        entity_type = None
        if name.startswith("Région de ") or name.startswith("Région d'"):
            entity_type = "region"
        elif name.startswith("Préfecture de ") or name.startswith("Préfecture d'") or name.startswith("Province de ") or name.startswith("Province d'"):
            entity_type = "province_prefecture"
        elif name.startswith("Arrondissement de ") or name.startswith("Arrondissement d'"):
            entity_type = "arrondissement"
        elif name.startswith("Commune de ") or name.startswith("Commune d'"):
            entity_type = "commune"
        elif name.startswith("Cercle de ") or name.startswith("Cercle d'"):
            entity_type = "cercle"
        elif name.startswith("dont le centre urbain"):
            entity_type = "urban_center"
        if not entity_type:
            continue
        entities.append({
            "name": name,
            "normalizedName": norm(name),
            "code": code,
            "type": entity_type,
            "population": parse_int(row[3] if len(row) > 3 else ""),
            "households": parse_int(row[4] if len(row) > 4 else ""),
        })
    urban = []
    for entity in entities:
        if entity["type"] != "commune":
            continue
        # HCP 2024 geographic code: the .01. branch contains municipalities/urban communes.
        if re.match(r"^\d{2}\.\d{3}\.01\.(?:0|\d{2})$", entity["code"]):
            urban.append(entity)
    return entities, urban


def extract_barid():
    sheets = parse_xlsx(fetch_bytes(BARID_XLSX), "barid-neighborhoods.xlsx")
    sheet = max(sheets, key=lambda item: len(item["rows"]))
    rows = sheet["rows"]
    header_index = next(
        (i for i, row in enumerate(rows[:20]) if "VILLE" in row and "QUARTIER" in row),
        0,
    )
    header = rows[header_index]
    city_col = header.index("VILLE")
    district_col = header.index("QUARTIER")
    postal_col = header.index("NOUVEAU CODE POSTAL") if "NOUVEAU CODE POSTAL" in header else None
    result = []
    for row in rows[header_index + 1:]:
        city = row[city_col].strip() if city_col < len(row) else ""
        district = row[district_col].strip() if district_col < len(row) else ""
        postal = row[postal_col].strip() if postal_col is not None and postal_col < len(row) else ""
        if city and district:
            result.append({
                "city": city,
                "cityNormalized": norm(city),
                "district": district,
                "districtNormalized": norm(district),
                "postalCode": postal,
            })
    return result


def osm_names(tags):
    keys = ["name", "name:fr", "name:en", "official_name", "short_name"]
    return sorted({str(tags.get(key, "")).strip() for key in keys if str(tags.get(key, "")).strip()})


def fetch_osm_admin8_metadata():
    query = """[out:json][timeout:180];
area[\"ISO3166-1\"=\"MA\"][admin_level=2]->.ma;
relation(area.ma)[\"boundary\"=\"administrative\"][\"admin_level\"=\"8\"];
out tags center;"""
    payload, endpoint = overpass(query)
    rows = []
    for element in payload.get("elements", []):
        if element.get("type") != "relation":
            continue
        tags = element.get("tags", {})
        center = element.get("center") or {}
        names = osm_names(tags)
        rows.append({
            "relationId": element.get("id"),
            "names": names,
            "normalizedNames": sorted({norm(name) for name in names if norm(name)}),
            "nameAr": tags.get("name:ar"),
            "wikidata": tags.get("wikidata"),
            "place": tags.get("place"),
            "boundary": tags.get("boundary"),
            "adminLevel": tags.get("admin_level"),
            "center": {"lat": center.get("lat"), "lng": center.get("lon")},
        })
    return rows, endpoint


def exact_match(hcp_urban, osm_rows):
    osm_by_name = defaultdict(list)
    for osm in osm_rows:
        for name in osm["normalizedNames"]:
            osm_by_name[name].append(osm)
    matches = []
    for entity in hcp_urban:
        candidates = osm_by_name.get(entity["normalizedName"], [])
        status = "unmatched"
        selected = None
        if len(candidates) == 1:
            status = "exact"
            selected = candidates[0]
        elif len(candidates) > 1:
            status = "ambiguous"
        matches.append({
            **entity,
            "osmMatchStatus": status,
            "osmRelationId": selected.get("relationId") if selected else None,
            "osmNames": selected.get("names") if selected else [],
            "center": selected.get("center") if selected else None,
        })
    return matches


def points_equal(a, b, eps=1e-9):
    return abs(a[0] - b[0]) <= eps and abs(a[1] - b[1]) <= eps


def stitch_segments(segments):
    remaining = [segment[:] for segment in segments if len(segment) >= 2]
    rings = []
    while remaining:
        ring = remaining.pop(0)
        changed = True
        while changed and remaining and not points_equal(ring[0], ring[-1]):
            changed = False
            for i, seg in enumerate(remaining):
                if points_equal(ring[-1], seg[0]):
                    ring.extend(seg[1:])
                elif points_equal(ring[-1], seg[-1]):
                    ring.extend(list(reversed(seg[:-1])))
                elif points_equal(ring[0], seg[-1]):
                    ring = seg[:-1] + ring
                elif points_equal(ring[0], seg[0]):
                    ring = list(reversed(seg[1:])) + ring
                else:
                    continue
                remaining.pop(i)
                changed = True
                break
        if len(ring) >= 4 and points_equal(ring[0], ring[-1]):
            rings.append(ring)
    return rings


def point_in_ring(point, ring):
    x, y = point
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-30) + xi):
            inside = not inside
        j = i
    return inside


def relation_to_geometry(relation):
    outer_segments, inner_segments = [], []
    for member in relation.get("members", []):
        if member.get("type") != "way" or member.get("role") not in ("outer", "inner"):
            continue
        geometry = member.get("geometry") or []
        coords = [(float(p["lon"]), float(p["lat"])) for p in geometry if "lon" in p and "lat" in p]
        if len(coords) < 2:
            continue
        (outer_segments if member.get("role") == "outer" else inner_segments).append(coords)
    outers = stitch_segments(outer_segments)
    inners = stitch_segments(inner_segments)
    if not outers:
        return None
    polygons = [[outer] for outer in outers]
    for inner in inners:
        probe = inner[0]
        placed = False
        for polygon in polygons:
            if point_in_ring(probe, polygon[0]):
                polygon.append(inner)
                placed = True
                break
        if not placed:
            return None
    if len(polygons) == 1:
        return {"type": "Polygon", "coordinates": polygons[0]}
    return {"type": "MultiPolygon", "coordinates": polygons}


def fetch_geometries(relation_ids):
    if not relation_ids:
        return {}, None
    ids = ",".join(str(value) for value in relation_ids)
    query = f"[out:json][timeout:240];relation(id:{ids});out geom;"
    payload, endpoint = overpass(query, timeout=300)
    geometries = {}
    for relation in payload.get("elements", []):
        if relation.get("type") != "relation":
            continue
        geometry = relation_to_geometry(relation)
        if geometry:
            geometries[int(relation["id"])] = geometry
    return geometries, endpoint


def main():
    hcp_entities, hcp_urban = extract_hcp()
    barid = extract_barid()
    osm_rows, metadata_endpoint = fetch_osm_admin8_metadata()
    matched = exact_match(hcp_urban, osm_rows)

    hcp_by_norm = defaultdict(list)
    for row in matched:
        hcp_by_norm[row["normalizedName"]].append(row)

    barid_city_names = sorted({row["city"] for row in barid})
    postal_city_matches = []
    geometry_relation_ids = []
    for city in barid_city_names:
        candidates = hcp_by_norm.get(norm(city), [])
        status = "unmatched"
        selected = None
        if len(candidates) == 1:
            selected = candidates[0]
            status = "exact"
            if selected.get("osmMatchStatus") == "exact" and selected.get("osmRelationId"):
                geometry_relation_ids.append(int(selected["osmRelationId"]))
        elif len(candidates) > 1:
            status = "ambiguous"
        postal_city_matches.append({
            "baridCity": city,
            "normalizedName": norm(city),
            "hcpMatchStatus": status,
            "hcpName": selected.get("name") if selected else None,
            "hcpCode": selected.get("code") if selected else None,
            "population": selected.get("population") if selected else None,
            "osmMatchStatus": selected.get("osmMatchStatus") if selected else None,
            "osmRelationId": selected.get("osmRelationId") if selected else None,
            "center": selected.get("center") if selected else None,
        })

    geometry_relation_ids = sorted(set(geometry_relation_ids))
    geometries, geometry_endpoint = fetch_geometries(geometry_relation_ids)

    geometry_features = []
    for match in postal_city_matches:
        relation_id = match.get("osmRelationId")
        geometry = geometries.get(int(relation_id)) if relation_id else None
        if not geometry:
            continue
        geometry_features.append({
            "type": "Feature",
            "properties": {
                "baridCity": match["baridCity"],
                "hcpName": match["hcpName"],
                "hcpCode": match["hcpCode"],
                "population": match["population"],
                "osmRelationId": relation_id,
                "sourceUrl": f"https://www.openstreetmap.org/relation/{relation_id}",
                "licenseId": "ODbL-1.0",
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
            "hcp": {"url": HCP_XLSX, "year": 2024, "entityCount": len(hcp_entities), "urbanMunicipalityCount": len(hcp_urban)},
            "barid": {"url": BARID_XLSX, "license": "ODbL-1.0", "rowCount": len(barid), "cityCount": len(barid_city_names), "uniqueCityDistrictPairs": len(unique_pairs)},
            "osm": {"license": "ODbL-1.0", "adminLevel": 8, "metadataEndpoint": metadata_endpoint, "geometryEndpoint": geometry_endpoint, "admin8RelationCount": len(osm_rows)},
        },
        "matching": {
            "hcpUrbanToOsmExact": sum(1 for row in matched if row["osmMatchStatus"] == "exact"),
            "hcpUrbanToOsmAmbiguous": sum(1 for row in matched if row["osmMatchStatus"] == "ambiguous"),
            "hcpUrbanToOsmUnmatched": sum(1 for row in matched if row["osmMatchStatus"] == "unmatched"),
            "baridCitiesToHcpExact": sum(1 for row in postal_city_matches if row["hcpMatchStatus"] == "exact"),
            "baridCitiesToHcpUnmatched": sum(1 for row in postal_city_matches if row["hcpMatchStatus"] == "unmatched"),
            "baridCitiesWithExactOsmRelation": sum(1 for row in postal_city_matches if row.get("osmMatchStatus") == "exact"),
            "baridCitiesWithAssembledGeometry": len(geometry_features),
        },
        "postalCityMatches": postal_city_matches,
        "neighborhoodCounts": dict(sorted(neighborhood_counts.items())),
    }

    (OUT / "hcp-urban-municipalities.json").write_text(json.dumps(matched, ensure_ascii=False, indent=2))
    (OUT / "barid-neighborhoods.json").write_text(json.dumps(barid, ensure_ascii=False, indent=2))
    (OUT / "postal-city-matches.json").write_text(json.dumps(postal_city_matches, ensure_ascii=False, indent=2))
    (OUT / "osm-admin8-candidates.json").write_text(json.dumps(osm_rows, ensure_ascii=False, indent=2))
    (OUT / "postal-city-boundaries.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": geometry_features}, ensure_ascii=False))
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))

    # Hard safety gates: exact matching only and enough geometry to justify UI implementation.
    if report["matching"]["baridCitiesToHcpExact"] < 20:
        raise SystemExit("insufficient HCP↔Barid exact city matches")
    if report["matching"]["baridCitiesWithAssembledGeometry"] < 10:
        raise SystemExit("insufficient exact OSM geometries for national map candidate")


if __name__ == "__main__":
    main()
