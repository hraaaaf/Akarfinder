#!/usr/bin/env python3
"""Find exact OSM boundary relations by name from a local PBF.

Authoring-only discovery helper. It emits relation metadata only and never
constructs geometry or infers a boundary from points.
"""
import argparse
import json

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pbf", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    import osmium

    wanted = args.name.strip().casefold()
    rows = []

    class Handler(osmium.SimpleHandler):
        def relation(self, r):
            tags = dict(r.tags)
            names = [tags.get("name"), tags.get("name:fr"), tags.get("name:ar")]
            normalized = {str(v).strip().casefold() for v in names if v}
            if wanted not in normalized:
                return
            rows.append({
                "osm_type": "relation",
                "osm_id": r.id,
                "name": tags.get("name"),
                "name:fr": tags.get("name:fr"),
                "name:ar": tags.get("name:ar"),
                "type": tags.get("type"),
                "boundary": tags.get("boundary"),
                "admin_level": tags.get("admin_level"),
                "wikidata": tags.get("wikidata"),
                "wikipedia": tags.get("wikipedia"),
                "version": r.version,
                "timestamp": str(r.timestamp),
            })

    Handler().apply_file(args.pbf, locations=False)
    rows.sort(key=lambda x: (x.get("boundary") != "administrative", x.get("admin_level") or "", x["osm_id"]))
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({"query": args.name, "matches": rows}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(json.dumps({"query": args.name, "count": len(rows), "matches": rows}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
