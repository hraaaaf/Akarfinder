#!/usr/bin/env python3
"""Build a fail-open inventory of Morocco neighborhood labels from a local OSM PBF.

This is DISCOVERY ONLY. It does not certify a neighborhood, define a product
boundary, or authorize publication. Geometry promotion remains a separate gate.
"""
import argparse, json
from collections import Counter

PLACE_VALUES={"neighbourhood","quarter","suburb","city_district"}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--pbf",required=True)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()

    import osmium
    rows=[]

    def keep(tags):
        place=tags.get("place")
        boundary=tags.get("boundary")
        admin=tags.get("admin_level")
        return place in PLACE_VALUES or (boundary=="administrative" and admin)

    def base(obj_type,obj_id,tags,version,timestamp,lon=None,lat=None):
        return {
            "osm_type":obj_type,"osm_id":obj_id,
            "name":tags.get("name"),"name:fr":tags.get("name:fr"),"name:ar":tags.get("name:ar"),
            "alt_name":tags.get("alt_name"),"place":tags.get("place"),
            "boundary":tags.get("boundary"),"admin_level":tags.get("admin_level"),
            "wikidata":tags.get("wikidata"),"wikipedia":tags.get("wikipedia"),
            "lon":lon,"lat":lat,"version":version,"timestamp":str(timestamp),
            "status":"DISCOVERY_ONLY"
        }

    class H(osmium.SimpleHandler):
        def node(self,n):
            tags=dict(n.tags)
            if not keep(tags): return
            if not any(tags.get(k) for k in ("name","name:fr","name:ar")): return
            lon=lat=None
            if n.location.valid():
                lon=float(n.location.lon); lat=float(n.location.lat)
            rows.append(base("node",n.id,tags,n.version,n.timestamp,lon,lat))
        def way(self,w):
            tags=dict(w.tags)
            if not keep(tags): return
            if not any(tags.get(k) for k in ("name","name:fr","name:ar")): return
            rows.append(base("way",w.id,tags,w.version,w.timestamp))
        def relation(self,r):
            tags=dict(r.tags)
            if not keep(tags): return
            if not any(tags.get(k) for k in ("name","name:fr","name:ar")): return
            rows.append(base("relation",r.id,tags,r.version,r.timestamp))

    H().apply_file(args.pbf,locations=True)
    rows.sort(key=lambda x:((x.get("name") or x.get("name:fr") or x.get("name:ar") or "").casefold(),x["osm_type"],x["osm_id"]))
    counts={
        "total":len(rows),
        "by_osm_type":dict(Counter(r["osm_type"] for r in rows)),
        "by_place":dict(Counter(r["place"] or "(none)" for r in rows)),
        "administrative_boundary_count":sum(1 for r in rows if r.get("boundary")=="administrative"),
    }
    payload={
        "schema_version":1,
        "scope":"Morocco",
        "purpose":"national-neighborhood-discovery-inventory",
        "counts":counts,
        "guardrails":[
            "Inventory membership does not certify a real-estate product neighborhood.",
            "OSM labels and administrative boundaries are materialization/discovery evidence, not product truth.",
            "No item may be promoted to a product polygon without independent corroboration, topology checks, and review.",
            "Historical/urban-planning sectors must remain distinct from modern product geography unless evidence proves equivalence."
        ],
        "items":rows
    }
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(payload,f,ensure_ascii=False,indent=2); f.write("\n")
    print(json.dumps(counts,ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
