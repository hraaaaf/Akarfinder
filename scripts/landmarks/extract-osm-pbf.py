#!/usr/bin/env python3
"""Offline OSM PBF -> Landmark Factory candidate JSONL.

Authoring-only helper. Reads a local Geofabrik/BBBike .osm.pbf and emits named,
high-signal POIs inside a caller-supplied bbox. It never writes Supabase and is
not imported by application runtime.

Requires: pip install osmium\n\nNodes are emitted directly. Ways are emitted from a second pass using a\nNodeLocationsForWays location index and a deterministic bbox centroid of their\nvalid node geometry. Relations are still omitted until a proper multipolygon\nassembler is added; no synthetic relation coordinate is invented.
Usage:
  python scripts/landmarks/extract-osm-pbf.py \
    --pbf /path/morocco-latest.osm.pbf \
    --bbox -7.75,33.45,-7.45,33.70 \
    --out /tmp/casablanca-poi.jsonl
"""
import argparse, json

SIGNALS = {
    "historic": None,
    "tourism": {"museum", "attraction", "gallery", "hotel"},
    "leisure": {"park", "stadium", "sports_centre", "garden"},
    "amenity": {"place_of_worship", "theatre", "arts_centre", "university", "hospital", "marketplace"},
    "shop": {"mall"},
    "man_made": {"tower", "lighthouse"},
}

def high_signal(tags):
    for key, accepted in SIGNALS.items():
        value = tags.get(key)
        if value and (accepted is None or value in accepted):
            return True
    return False

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pbf", required=True)
    ap.add_argument("--bbox", required=True, help="minLon,minLat,maxLon,maxLat")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    min_lon, min_lat, max_lon, max_lat = map(float, args.bbox.split(","))

    try:
        import osmium
    except ImportError as exc:
        raise SystemExit("Missing pyosmium: pip install osmium") from exc

    class Handler(osmium.SimpleHandler):
        def __init__(self, output):
            super().__init__()
            self.output = output

        def emit(self, obj, kind, lon, lat):
            if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
                return
            tags = dict(obj.tags)
            name = tags.get("name") or tags.get("name:fr") or tags.get("name:ar")
            if not name or not high_signal(tags):
                return
            self.output.write(json.dumps({
                "type": kind, "id": obj.id, "lat": lat, "lon": lon,
                "tags": tags,
            }, ensure_ascii=False) + "\n")

        def node(self, n):
            if n.location.valid():
                self.emit(n, "node", n.location.lon, n.location.lat)

        def way(self, w):
            tags = dict(w.tags)
            name = tags.get("name") or tags.get("name:fr") or tags.get("name:ar")
            if not name or not high_signal(tags):
                return
            points = [(n.lon, n.lat) for n in w.nodes if n.location.valid()]
            if not points:
                return
            lon = (min(x for x, _ in points) + max(x for x, _ in points)) / 2
            lat = (min(y for _, y in points) + max(y for _, y in points)) / 2
            self.emit(w, "way", lon, lat)

    with open(args.out, "w", encoding="utf-8") as output:
        Handler(output).apply_file(args.pbf, locations=True)

if __name__ == "__main__":
    main()
