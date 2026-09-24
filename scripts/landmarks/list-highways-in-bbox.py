#!/usr/bin/env python3
"""List named highway ways intersecting a small bbox."""
import argparse, json
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--pbf",required=True)
    ap.add_argument("--bbox",required=True,help="minlon,minlat,maxlon,maxlat")
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    minlon,minlat,maxlon,maxlat=[float(x) for x in args.bbox.split(",")]
    import osmium
    rows=[]
    class H(osmium.SimpleHandler):
        def way(self,w):
            tags=dict(w.tags)
            if not tags.get("highway"): return
            coords=[[n.lon,n.lat] for n in w.nodes if n.location.valid()]
            if not coords: return
            if not any(minlon<=x<=maxlon and minlat<=y<=maxlat for x,y in coords): return
            rows.append({
              "osm_id":w.id,
              "name":tags.get("name"),
              "name:fr":tags.get("name:fr"),
              "old_name":tags.get("old_name"),
              "alt_name":tags.get("alt_name"),
              "highway":tags.get("highway"),
              "coordinates":coords
            })
    H().apply_file(args.pbf,locations=True)
    rows.sort(key=lambda r:r["osm_id"])
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump({"bbox":[minlon,minlat,maxlon,maxlat],"matches":rows},f,ensure_ascii=False,indent=2);f.write("\n")
    names=sorted({r.get("name") or r.get("name:fr") for r in rows if r.get("name") or r.get("name:fr")})
    print(json.dumps({"count":len(rows),"names":names},ensure_ascii=False,indent=2))
if __name__=="__main__": main()
