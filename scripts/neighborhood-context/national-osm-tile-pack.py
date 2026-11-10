#!/usr/bin/env python3
"""Build/query private versioned 0.05-degree OSM landmark tiles from J11 SQLite.

J11-B export/preview only; never publishes files or writes an application database.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import sqlite3
from collections import defaultdict
from pathlib import Path

INDEX_SCHEMA = "AKARFINDER_OSM_LANDMARKS_RTREE_V1"
PACK_SCHEMA = "AKARFINDER_OSM_LANDMARK_TILES_V1"
SOURCE = "Geofabrik Morocco OpenStreetMap PBF"
CATEGORIES = ("education", "green_sport", "groceries", "health", "shopping", "transport")
CELL_SCALE = 20  # 0.05 degrees; fixed for a stable cross-platform tile key
MAX_READ_CELLS = 64


def cell(lon: float, lat: float) -> tuple[int, int]:
    if not all(math.isfinite(v) for v in (lon, lat)) or not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise ValueError("Invalid coordinate")
    return min(7199, math.floor((lon + 180) * CELL_SCALE)), min(3599, math.floor((lat + 90) * CELL_SCALE))


def path_for(x: int, y: int) -> str:
    return f"tiles/{x:04d}/{y:04d}.json"


def stable_bytes(obj: object) -> bytes:
    return (json.dumps(obj, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n").encode("utf-8")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def valid_meta(meta: dict[str, str]) -> bool:
    return (meta.get("schema") == INDEX_SCHEMA and meta.get("source") == SOURCE
            and meta.get("license") == "ODbL-1.0" and meta.get("publication_state") == "PRIVATE_QA_ONLY"
            and meta.get("geographic_scope") == "whole-Morocco-not-district"
            and len(meta.get("md5", "")) == 32 and len(meta.get("sha256", "")) == 64
            and all(c in "0123456789abcdef" for c in (meta.get("md5", "") + meta.get("sha256", ""))))


def feature(osm_id: str, name: str, category: str, lon: float, lat: float, kind: str) -> dict:
    kind_osm, _, oid = osm_id.partition("/")
    if kind_osm not in ("node", "way", "relation") or not oid.isdigit() or int(oid) <= 0:
        raise ValueError("Invalid OSM ID")
    if not name.strip() or len(name.strip()) > 200 or category not in CATEGORIES:
        raise ValueError("Invalid feature name/category")
    if kind not in ("osm_node", "osm_polygon_representative_point"):
        raise ValueError("Invalid position kind")
    cell(lon, lat)
    return {"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {"osmId": osm_id, "name": name.strip(), "category": category,
                           "sourceUrl": "https://www.openstreetmap.org/" + osm_id,
                           "positionType": "osm-node" if kind == "osm_node" else "indicative-area-point",
                           "currentlyOpen": None, "officialQuarterMembership": None}}


def build(index: Path, out: Path) -> dict:
    if not index.is_file():
        raise ValueError("Index missing")
    if out.exists() or out.with_name(out.name + ".part").exists():
        raise ValueError("Pack exists or interrupted .part needs review")
    temp = out.with_name(out.name + ".part")
    db = sqlite3.connect(index.resolve().as_uri() + "?mode=ro", uri=True)
    try:
        meta = dict(db.execute("SELECT key,value FROM metadata"))
        if not valid_meta(meta):
            raise ValueError("Source index integrity/provenance invalid")
        if db.execute("PRAGMA quick_check").fetchone() != ("ok",):
            raise ValueError("SQLite quick_check failed")
        if int(meta.get("feature_count", "-1")) != db.execute("SELECT count(*) FROM landmarks").fetchone()[0]:
            raise ValueError("Feature count mismatch")
        temp.mkdir(parents=True)
        tiles = {}
        total = 0
        previous_key = None
        batch = []

        def flush() -> None:
            nonlocal batch
            if previous_key is None:
                return
            x, y = previous_key
            rel = path_for(x, y)
            raw = stable_bytes({"schema": PACK_SCHEMA, "state": "PRIVATE_QA_ONLY", "features": batch})
            dest = temp / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(raw)
            tiles[f"{x}:{y}"] = {"path": rel, "sha256": sha(raw), "count": len(batch)}
            batch = []

        # SQLite handles the sort on disk; Python holds only one tile in memory.
        records = db.execute("""
            SELECT osm_id,name,category,lon,lat,point_kind,
              CAST(MIN(7199,(lon+180)*20) AS INTEGER) x,
              CAST(MIN(3599,(lat+90)*20) AS INTEGER) y
            FROM landmarks ORDER BY x,y,osm_id
        """)
        seen = set()
        for osm_id, name, cat, lon, lat, kind, x, y in records:
            current = cell(lon, lat)
            if (x, y) != current:
                raise ValueError("Tile key mismatch")
            if osm_id in seen:
                raise ValueError("Duplicate OSM ID")
            seen.add(osm_id)
            if previous_key is not None and previous_key != current:
                flush()
            previous_key = current
            batch.append(feature(osm_id, name, cat, lon, lat, kind))
            total += 1
        flush()
        if total < 1:
            raise ValueError("No landmarks")
        manifest = {"schema": PACK_SCHEMA, "state": "PRIVATE_QA_ONLY",
                    "source": SOURCE, "sourceMd5": meta["md5"], "sourceSha256": meta["sha256"],
                    "license": "ODbL-1.0", "attribution": "© OpenStreetMap contributors",
                    "cellSizeDegrees": 0.05, "featureCount": total, "tileCount": len(tiles),
                    "businessOperatingStatusCertified": False,
                    "officialNeighborhoodMembershipCertified": False,
                    "entrancePrecisionCertified": False, "tiles": tiles}
        (temp / "manifest.json").write_bytes(stable_bytes(manifest))
        temp.rename(out)
        return manifest
    except Exception:
        if temp.exists():
            shutil.rmtree(temp)
        raise
    finally:
        db.close()


def query(pack: Path, bbox: tuple[float, float, float, float], limit: int = 180) -> dict:
    if not isinstance(limit, int) or not (1 <= limit <= 1000):
        raise ValueError("Limit must be 1..1000")
    if len(bbox) != 4 or not all(math.isfinite(v) for v in bbox):
        raise ValueError("Invalid bbox")
    west, south, east, north = bbox
    if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
        raise ValueError("Invalid bbox bounds")
    x0, y0 = cell(west, south)
    x1, y1 = cell(east, north)
    if (x1 - x0 + 1) * (y1 - y0 + 1) > MAX_READ_CELLS:
        raise ValueError("Viewport too large: read-model disabled at national zoom")
    manifest = json.loads((pack / "manifest.json").read_text(encoding="utf-8"))
    if (manifest.get("schema"), manifest.get("state"), manifest.get("source"), manifest.get("license")) != (
        PACK_SCHEMA, "PRIVATE_QA_ONLY", SOURCE, "ODbL-1.0"):
        raise ValueError("Invalid pack provenance")
    groups = defaultdict(list)
    seen = set()
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            entry = manifest["tiles"].get(f"{x}:{y}")
            if entry is None:
                continue
            rel = path_for(x, y)
            if entry.get("path") != rel:
                raise ValueError("Unsafe tile path")
            raw = (pack / rel).read_bytes()
            if sha(raw) != entry.get("sha256"):
                raise ValueError("Tile checksum failed")
            tile = json.loads(raw)
            if tile.get("schema") != PACK_SCHEMA or tile.get("state") != "PRIVATE_QA_ONLY" or len(tile.get("features", [])) != entry.get("count"):
                raise ValueError("Tile schema/count failed")
            for f in tile["features"]:
                p = f["properties"]
                lon, lat = f["geometry"]["coordinates"]
                if cell(lon, lat) != (x, y) or p.get("currentlyOpen", "sentinel") is not None or p.get("officialQuarterMembership", "sentinel") is not None:
                    raise ValueError("Unsafe tile feature")
                if not (west <= lon <= east and south <= lat <= north):
                    continue
                if p["osmId"] in seen:
                    raise ValueError("Duplicate OSM ID")
                seen.add(p["osmId"])
                groups[p["category"]].append(f)
    for category in CATEGORIES:
        groups[category].sort(key=lambda f: f["properties"]["osmId"])
    chosen = []
    while len(chosen) < limit:
        changed = False
        for cat in CATEGORIES:
            if groups[cat]:
                chosen.append(groups[cat].pop(0))
                changed = True
            if len(chosen) == limit:
                break
        if not changed:
            break
    return {"schema": "AKARFINDER_OSM_INDICATIVE_LANDMARKS_V1", "ok": True,
            "state": "PRIVATE_CANDIDATE_NO_DB_OR_UI_WRITE", "label": "Repères à proximité",
            "source": "OpenStreetMap via Geofabrik", "attribution": "© OpenStreetMap contributors",
            "license": "ODbL-1.0", "businessOperatingStatusCertified": False,
            "officialNeighborhoodMembershipCertified": False, "entrancePrecisionCertified": False,
            "features": chosen}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    b = sub.add_parser("build")
    b.add_argument("--index", required=True, type=Path)
    b.add_argument("--out-dir", required=True, type=Path)
    q = sub.add_parser("query")
    q.add_argument("--pack-dir", required=True, type=Path)
    q.add_argument("--bbox", required=True)
    q.add_argument("--limit", type=int, default=180)
    q.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.action == "build":
        result = build(args.index, args.out_dir)
        print(json.dumps({"ok": True, "tiles": result["tileCount"], "features": result["featureCount"]}))
    else:
        output = query(args.pack_dir, tuple(float(v) for v in args.bbox.split(",")), args.limit)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(stable_bytes(output))
        print(json.dumps({"ok": True, "features": len(output["features"])}))


if __name__ == "__main__":
    main()
