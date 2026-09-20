#!/usr/bin/env python3
"""Materialize one OSM relation boundary from a local PBF as validated GeoJSON.

Authoring-only. The relation is assembled from its real member ways/nodes by
pyosmium area processing. No centroid/bbox/POI inference is permitted.
"""
import argparse
import json
from pathlib import Path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pbf", required=True)
    ap.add_argument("--relation-id", required=True, type=int)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    import osmium
    from shapely.geometry import shape, mapping, MultiPolygon
    from shapely.geometry.polygon import orient
    from shapely.validation import explain_validity

    factory = osmium.geom.GeoJSONFactory()
    found = {}

    class Handler(osmium.SimpleHandler):
        def relation(self, r):
            if r.id == args.relation_id:
                found["relation_tags"] = dict(r.tags)
                found["relation_version"] = r.version
                found["relation_timestamp"] = str(r.timestamp)

        def area(self, area):
            if area.from_way() or area.orig_id() != args.relation_id:
                return
            geom = json.loads(factory.create_multipolygon(area))
            found["area_tags"] = dict(area.tags)
            found["geometry"] = geom
            found["ring_counts"] = {
                "outer": sum(1 for _ in area.outer_rings()),
                "inner": sum(sum(1 for _ in area.inner_rings(outer)) for outer in area.outer_rings()),
            }

    Handler().apply_file(args.pbf, locations=True)

    if "geometry" not in found:
        raise SystemExit(f"OSM relation {args.relation_id} could not be assembled as an area")

    tags = found.get("relation_tags", found.get("area_tags", {}))
    if tags.get("type") not in {"boundary", "multipolygon"}:
        raise SystemExit(f"relation type is not boundary/multipolygon: {tags.get('type')!r}")

    geom = shape(found["geometry"])
    if geom.geom_type not in {"Polygon", "MultiPolygon"}:
        raise SystemExit(f"unsupported assembled geometry type: {geom.geom_type}")
    if not geom.is_valid:
        raise SystemExit(f"invalid assembled geometry: {explain_validity(geom)}")
    if geom.is_empty:
        raise SystemExit("assembled geometry is empty")

    if geom.geom_type == "Polygon":
        geom = orient(geom, sign=1.0)
    else:
        geom = MultiPolygon([orient(poly, sign=1.0) for poly in geom.geoms])

    geometry = mapping(geom)
    feature = {
        "type": "Feature",
        "properties": {
            "osm_type": "relation",
            "osm_id": args.relation_id,
            "name": tags.get("name"),
            "name:fr": tags.get("name:fr"),
            "name:ar": tags.get("name:ar"),
            "boundary": tags.get("boundary"),
            "admin_level": tags.get("admin_level"),
            "relation_type": tags.get("type"),
            "wikidata": tags.get("wikidata"),
            "wikipedia": tags.get("wikipedia"),
            "relation_version": found.get("relation_version"),
            "relation_timestamp": found.get("relation_timestamp"),
            "assembled_by": "pyosmium-area",
            "geometry_valid": True,
            "orientation": "RFC7946 exterior CCW / holes CW",
            "outer_rings": found["ring_counts"]["outer"],
            "inner_rings": found["ring_counts"]["inner"],
        },
        "geometry": geometry,
    }
    Path(args.out).write_text(json.dumps(feature, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(feature["properties"], ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
