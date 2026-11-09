#!/usr/bin/env python3
"""Private OSM pilot inventory; never a business-opening or legal-quarter certification.

Reads a pinned Geofabrik Morocco PBF *locally* using pyosmium. This is not an API
or production database writer. Nodes and assembled OSM areas (ways/relations)
are reviewed in the same 1,800 m center context. Original OSM positions must
still be independently checked before a public AkarFinder pin is authorized.
"""
import argparse
import hashlib
import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import osmium
from shapely.geometry import shape

REF_LAT = 33.5898
REF_LON = -7.644
RADIUS_M = 1800
ATTRIBUTION = "© OpenStreetMap contributors"
LICENSE_URL = "https://www.openstreetmap.org/copyright"
GEOFABRIK_URL = "https://download.geofabrik.de/africa/morocco-latest.osm.pbf"
CATEGORIES = {
    "education": {"amenity": {"school", "kindergarten", "college", "university"}},
    "groceries": {
        "shop": {"supermarket", "convenience", "greengrocer", "grocery"},
        "amenity": {"marketplace"},
    },
    "health": {"amenity": {"pharmacy", "clinic", "hospital", "doctors", "dentist"}},
    "transport": {
        "highway": {"bus_stop"},
        "public_transport": {"platform", "station"},
        "railway": {"station", "halt", "tram_stop"},
    },
    "green_sport": {"leisure": {"park", "playground", "fitness_centre", "sports_centre", "pitch"}},
    "shopping": {"shop": {"mall", "department_store"}},
}


def category_for(tags):
    for category, choices in CATEGORIES.items():
        if any(tags.get(key, "") in options for key, options in choices.items()):
            return category
    return None


def haversine(lat, lon):
    dlat = math.radians(lat - REF_LAT)
    dlon = math.radians(lon - REF_LON)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat))*math.cos(math.radians(REF_LAT))*math.sin(dlon/2)**2
    return 6371000 * 2 * math.asin(min(1, math.sqrt(a)))


def file_md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(2*1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()


class MaarifHandler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.records = []
        self.ids = set()
        self.rejected = Counter()
        self.point_count = 0
        self.area_count = 0
        self.factory = osmium.geom.GeoJSONFactory()

    def consider(self, typ, obj_id, tags, lat, lon, precision):
        if not (math.isfinite(lat) and math.isfinite(lon)):
            self.rejected["invalid_coordinates"] += 1
            return
        # Fast geographic gate. It is a radius *context*, never a quarter polygon.
        if abs(lat-REF_LAT) > 0.025 or abs(lon-REF_LON) > 0.035:
            return
        distance = haversine(lat, lon)
        if distance > RADIUS_M:
            return
        category = category_for(tags)
        if category is None:
            return
        name = str(tags.get("name") or tags.get("name:fr") or tags.get("name:ar") or "").strip()
        if not name:
            self.rejected["missing_name"] += 1
            return
        identity = f"{typ}/{obj_id}"
        if identity in self.ids:
            self.rejected["duplicate_osm_identity"] += 1
            return
        self.ids.add(identity)
        self.records.append({
            "source_id": identity,
            "source_url": f"https://www.openstreetmap.org/{identity}",
            "name_osm": name,
            "category": category,
            "latitude": round(lat, 7),
            "longitude": round(lon, 7),
            "distance_from_center_m": round(distance, 1),
            "location_method": precision,
            "status": "candidate_requires_independent_review",
            "current_operation_verified": False,
            "position_precision_independently_verified": False,
            "central_quarter_membership_certified": False,
            "source_license": "ODbL-1.0",
        })

    def node(self, node):
        self.point_count += 1
        tags = node.tags
        if category_for(tags) is None:
            return
        try:
            if node.location.valid():
                self.consider("node", node.id, tags, node.location.lat, node.location.lon, "osm_node")
        except Exception:
            self.rejected["node_geometry_error"] += 1

    def area(self, area):
        self.area_count += 1
        if category_for(area.tags) is None:
            return
        try:
            geom = shape(json.loads(self.factory.create_multipolygon(area)))
            if geom.is_empty or not geom.is_valid:
                self.rejected["invalid_area_geometry"] += 1
                return
            point = geom.representative_point()
            typ = "way" if area.from_way() else "relation"
            self.consider(typ, area.orig_id(), area.tags, point.y, point.x, "osm_polygon_representative_point")
        except Exception:
            self.rejected["area_geometry_error"] += 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pbf", type=Path, required=True)
    parser.add_argument("--md5-file", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    pbf = args.pbf.resolve()
    md5file = args.md5_file.resolve()
    output = args.output.resolve()
    if not pbf.is_file() or not md5file.is_file():
        raise RuntimeError("Pinned PBF and matching checksum file must both exist")
    expected = md5file.read_text(encoding="utf-8").strip().split()[0].lower()
    actual = file_md5(pbf).lower()
    if expected != actual:
        raise RuntimeError(f"PBF checksum mismatch expected={expected} actual={actual}; refused to parse")
    h = MaarifHandler()
    h.apply_file(str(pbf), locations=True, idx="flex_mem")
    counts = dict(sorted(Counter(row["category"] for row in h.records).items()))
    geom_counts = dict(sorted(Counter(row["source_id"].split("/")[0] for row in h.records).items()))
    result = {
        "schema": "AKARFINDER_MAARIF_OSM_PBF_QA_V1",
        "status": "QA_CANDIDATES_NOT_PUBLISHABLE",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "dataset": "Geofabrik Morocco OpenStreetMap PBF",
            "url": GEOFABRIK_URL,
            "md5_verified": True,
            "md5": actual,
            "bytes": pbf.stat().st_size,
            "attribution": ATTRIBUTION,
            "license": "ODbL-1.0",
            "license_url": LICENSE_URL,
            "individual_business_operational_freshness_checked": False,
        },
        "geographic_scope": {
            "reference_center": {"latitude": REF_LAT, "longitude": REF_LON},
            "radius_m": RADIUS_M,
            "claim": "radius_context_only_no_quarter_membership",
        },
        "candidates_count": len(h.records),
        "counts": counts,
        "object_types": geom_counts,
        "rejections": dict(h.rejected),
        "total_nodes_scanned": h.point_count,
        "total_areas_scanned": h.area_count,
        "publication_guard": {
            "eligible": False,
            "all_individual_operations_unverified": True,
            "all_individual_coords_unverified": True,
            "boundary_unreviewed": True,
            "db_write": False,
            "no_ui_publication": True,
        },
        "candidates": sorted(h.records, key=lambda row: (row["category"], row["distance_from_center_m"], row["source_id"])),
    }
    if not result["candidates_count"]:
        raise RuntimeError("No valid OSM candidates; QA output refused")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({
        "output": str(output),
        "status": result["status"],
        "candidates_count": result["candidates_count"],
        "counts": counts,
        "types": geom_counts,
        "rejected": dict(h.rejected),
        "source_md5_verified": True,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
