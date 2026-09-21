#!/usr/bin/env python3
"""Find exact OSM place anchors (nodes/ways/relations) by name in a local PBF.

Authoring-only product-geography helper. It records labeled places and their
coordinates/tags. It NEVER treats a point or a named feature as a polygon.
"""
import argparse
import json

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--pbf",required=True)
    ap.add_argument("--name",action="append",required=True)
    ap.add_argument("--bbox",required=True,help="minlon,minlat,maxlon,maxlat")
    ap.add_argument("--out",required=True)
    args=ap.parse_args()

    import osmium
    wanted={x.strip().casefold():x for x in args.name}
    minlon,minlat,maxlon,maxlat=[float(x) for x in args.bbox.split(",")]
    rows=[]

    def names(tags):
        return [tags.get("name"),tags.get("name:fr"),tags.get("name:ar"),tags.get("alt_name")]

    def matched(tags):
        normalized={str(v).strip().casefold() for v in names(tags) if v}
        return [orig for norm,orig in wanted.items() if norm in normalized]

    class Handler(osmium.SimpleHandler):
        def node(self,n):
            tags=dict(n.tags); q=matched(tags)
            if not q or not n.location.valid(): return
            lon,lat=float(n.location.lon),float(n.location.lat)
            if not (minlon<=lon<=maxlon and minlat<=lat<=maxlat): return
            rows.append({
                "query_names":q,"osm_type":"node","osm_id":n.id,
                "lon":lon,"lat":lat,"name":tags.get("name"),
                "name:fr":tags.get("name:fr"),"name:ar":tags.get("name:ar"),
                "place":tags.get("place"),"boundary":tags.get("boundary"),
                "admin_level":tags.get("admin_level"),"wikidata":tags.get("wikidata"),
                "wikipedia":tags.get("wikipedia"),"version":n.version,"timestamp":str(n.timestamp)
            })
        def way(self,w):
            tags=dict(w.tags); q=matched(tags)
            if not q: return
            rows.append({
                "query_names":q,"osm_type":"way","osm_id":w.id,
                "lon":None,"lat":None,"name":tags.get("name"),
                "name:fr":tags.get("name:fr"),"name:ar":tags.get("name:ar"),
                "place":tags.get("place"),"boundary":tags.get("boundary"),
                "admin_level":tags.get("admin_level"),"wikidata":tags.get("wikidata"),
                "wikipedia":tags.get("wikipedia"),"version":w.version,"timestamp":str(w.timestamp)
            })
        def relation(self,r):
            tags=dict(r.tags); q=matched(tags)
            if not q: return
            rows.append({
                "query_names":q,"osm_type":"relation","osm_id":r.id,
                "lon":None,"lat":None,"name":tags.get("name"),
                "name:fr":tags.get("name:fr"),"name:ar":tags.get("name:ar"),
                "place":tags.get("place"),"boundary":tags.get("boundary"),
                "admin_level":tags.get("admin_level"),"wikidata":tags.get("wikidata"),
                "wikipedia":tags.get("wikipedia"),"version":r.version,"timestamp":str(r.timestamp)
            })

    Handler().apply_file(args.pbf,locations=False)
    rows.sort(key=lambda x:(x["query_names"][0],x["osm_type"],x["osm_id"]))
    out={
        "mode":"product-place-anchor-discovery",
        "bbox":[minlon,minlat,maxlon,maxlat],
        "queries":args.name,
        "guardrail":"Exact-name place anchors are orientation evidence only; they are not product polygons.",
        "matches":rows,
    }
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(out,f,ensure_ascii=False,indent=2); f.write("\n")
    print(json.dumps({"queries":args.name,"count":len(rows),"matches":rows},ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
