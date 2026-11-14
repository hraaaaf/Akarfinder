#!/usr/bin/env python3
"""Private-only historical AUC road-axis prequalification using a pinned OSM PBF.

Extracts matched *street centerlines* (not a Maârif district boundary).
The road IDs, geometry and ODbL derivatives MUST stay in local QA and
must never be interpreted as a 2026 certified central-sector polygon.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import osmium

EXPECTED_PBF_MD5 = "c2334c9499b4565a6a16cf2f45624912"
BBOX = (-7.686, 33.562, -7.604, 33.620)  # broad QA search, not district limits
# Prefixes match the named historic BOULEVARDS, not unrelated streets
# sharing a surname (e.g. Rue Abdeslam Khattabi) or generic "Anfa".
GROUPS = {
    "north_khattabi": ("boulevard abdelkrim", "bd abdelkrim", "boulevard abdel karim"),
    "north_anfa": ("boulevard d anfa", "boulevard anfa", "bd d anfa"),
    "south_roudani": ("boulevard brahim roudani", "bd brahim roudani"),
    "east_zerktouni": ("boulevard mohamed zerktouni", "bd mohamed zerktouni"),
    "west_lybie": ("boulevard de lybie", "boulevard de libye", "bd de lybie", "bd de libye"),
    "west_bir_anzarane": ("boulevard bir anzarane", "bd bir anzarane"),
}
SIGNALS = ("name", "name:fr", "official_name", "alt_name", "old_name")
ROAD_TAGS = {
    "motorway", "trunk", "primary", "secondary", "tertiary", "residential",
    "living_street", "unclassified", "service", "motorway_link",
    "trunk_link", "primary_link", "secondary_link", "tertiary_link",
}


def norm(value: str) -> str:
    txt = "".join(c for c in unicodedata.normalize("NFKD", str(value).casefold())
                  if not unicodedata.combining(c))
    txt = re.sub(r"[^a-z0-9]+", " ", txt)
    return " ".join(txt.split())


def groups_for_tags(tags: dict[str, str]) -> set[str]:
    if tags.get("highway") not in ROAD_TAGS:
        return set()
    names = [norm(tags.get(key, "")) for key in SIGNALS if tags.get(key)]
    if not names:
        return set()
    output: set[str] = set()
    for group, markers in GROUPS.items():
        if any(name.startswith(marker) for name in names for marker in markers):
            output.add(group)
    return output


def md5sum(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


class NamedWays(osmium.SimpleHandler):
    # Osmium's native C++ location index avoids 34 million Python node callbacks.
    # Only the matched street ways are handed to Python.
    def __init__(self, bbox):
        super().__init__()
        self.bbox=bbox
        self.by_axis=defaultdict(list)
        self.scanned=0
        self.relevant_node_coords=set()

    def way(self, way):
        self.scanned+=1
        tags={tag.k:tag.v for tag in way.tags}
        matched=groups_for_tags(tags)
        if not matched:
            return
        minx,miny,maxx,maxy=self.bbox
        points=[]
        for node in way.nodes:
            if not node.location.valid():
                continue
            x,y=node.location.lon,node.location.lat
            if minx<=x<=maxx and miny<=y<=maxy:
                points.append((x,y))
        if len(points)<2:
            return
        self.relevant_node_coords.update(points)
        names={key:tags[key] for key in SIGNALS if key in tags}
        item={
            "osm_id":f"way/{way.id}",
            "name_tags":names,
            "highway":tags.get("highway"),
            "coordinates":points,
            "inside_bbox_only":True,
            "timestamp_osm_object":(
                str(way.timestamp) if way.timestamp and way.timestamp.year>1970 else None
            ),
            "not_a_boundary":True,
        }
        for key in matched:
            self.by_axis[key].append(item)


def audit(pbf: Path, output: Path, *, bbox=BBOX, require_pinned=True):
    if not pbf.exists():
        raise ValueError("PBF source missing")
    checksum = md5sum(pbf)
    if require_pinned and checksum != EXPECTED_PBF_MD5:
        raise ValueError("Pinned Geofabrik PBF checksum mismatch")
    b = NamedWays(bbox)
    b.apply_file(str(pbf), locations=True, idx="flex_mem")
    counts = {group: len(b.by_axis[group]) for group in GROUPS}
    result = {
        "schema": "AKARFINDER_MAARIF_HISTORICAL_AXIS_OSM_QA_V1",
        "source": {"pbf_md5": checksum, "osm_license": "ODbL-1.0"},
        "historical_urbanism_axes": {
            "north": ["Boulevard Abdelkrim Khattabi", "Boulevard d'Anfa"],
            "south": ["Boulevard Brahim Roudani"],
            "east": ["Boulevard Mohamed Zerktouni"],
            "west": ["Boulevard de Lybie", "Boulevard Bir Anzarane"],
        },
        "qa_search_bbox_wgs84_not_quartier": list(bbox),
        "source_nodes_scanned": None,
        "node_locations_indexed_natively": True,
        "source_ways_scanned": b.scanned,
        "matched_way_nodes_in_bbox": len(b.relevant_node_coords),
        "matched_way_counts": counts,
        "matched_way_ids": {
            k: [w["osm_id"] for w in b.by_axis[k]] for k in GROUPS
        },
        "candidate_centerlines": dict(b.by_axis),
        "scope": "QA_INDIVIDUAL_OSM_ROAD_CENTRELINES_ONLY",
        "derived_polygon": None,
        "polygon_area_ha": None,
        "CRS_for_polygon": None,
        "historical_central_sector_membership_certified": False,
        "2026_central_sector_boundary_certified": False,
        "publishable": False,
        "no_db_write": True,
        "no_public_map_change": True,
        "notes": [
            "Road names and centerlines are OSM volunteer data; centerlines are NOT administrative boundary edges.",
            "Coverage, street label ambiguity and name duplication must be reviewed before any manual georeferencing.",
            "Some ways leave the QA bbox, so stored coordinates may be clipped.",
            "AUC historical 103-ha sector geometry has not been obtained from an authoritative GIS dataset.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps({k: result[k] for k in (
        "source_nodes_scanned", "source_ways_scanned", "matched_way_nodes_in_bbox",
        "matched_way_counts", "derived_polygon", "publishable",
    )}, indent=2))
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--pbf", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    args = p.parse_args()
    audit(args.pbf, args.output)
