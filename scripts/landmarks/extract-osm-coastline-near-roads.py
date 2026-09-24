#!/usr/bin/env python3
"""Extract OSM coastline ways near authoritative boundary-road extents.

Uses the bbox of already-discovered road coordinates, expanded by a controlled
margin. This is authoring-only and fails closed if no coastline is found.
"""
import argparse, json

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--pbf", required=True)
    ap.add_argument("--roads", required=True)
    ap.add_argument("--margin-deg", type=float, default=0.03)
    ap.add_argument("--out", required=True)
    args=ap.parse_args()

    roads=json.load(open(args.roads,encoding="utf-8"))
    pts=[p for m in roads.get("matches",[]) for p in m.get("coordinates",[])]
    if not pts:
        raise SystemExit("no road coordinates available")
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    minx,maxx=min(xs)-args.margin_deg,max(xs)+args.margin_deg
    miny,maxy=min(ys)-args.margin_deg,max(ys)+args.margin_deg

    import osmium
    rows=[]

    class H(osmium.SimpleHandler):
        def way(self,w):
            tags=dict(w.tags)
            if tags.get("natural")!="coastline":
                return
            coords=[[n.lon,n.lat] for n in w.nodes if n.location.valid()]
            if len(coords)<2: return
            if not any(minx<=x<=maxx and miny<=y<=maxy for x,y in coords):
                return
            rows.append({
                "osm_type":"way",
                "osm_id":w.id,
                "natural":"coastline",
                "version":w.version,
                "timestamp":str(w.timestamp),
                "coordinates":coords
            })

    H().apply_file(args.pbf, locations=True)
    if not rows:
        raise SystemExit("no coastline ways found in expanded road bbox")
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump({
          "bbox":[minx,miny,maxx,maxy],
          "margin_deg":args.margin_deg,
          "matches":rows
        },f,ensure_ascii=False,indent=2)
        f.write("\n")
    print(json.dumps({"count":len(rows),"bbox":[minx,miny,maxx,maxy]},indent=2))

if __name__=="__main__":
    main()
