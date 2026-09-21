#!/usr/bin/env python3
"""Build a fail-closed Morocco neighborhood discovery backlog from local OSM PBF.

Discovery only:
- product_candidates = named place=neighbourhood/quarter/suburb/city_district
- administrative_references = named administrative boundaries
- urban_centers = named settlement nodes used only for nearest-locality hints

Nearest-locality output is HINT_ONLY. It never certifies city membership,
product taxonomy, or polygon geometry.
"""
import argparse
import json
import math
import os
from collections import Counter, defaultdict

PRODUCT_PLACE_VALUES={"neighbourhood","quarter","suburb","city_district"}
LOCALITY_PLACE_VALUES={"city","town","municipality","village"}

def haversine_km(lat1, lon1, lat2, lon2):
    r=6371.0088
    p1=math.radians(lat1); p2=math.radians(lat2)
    dphi=math.radians(lat2-lat1); dl=math.radians(lon2-lon1)
    a=math.sin(dphi/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*r*math.asin(math.sqrt(a))

def source_control():
    out={
        "event_name":os.environ.get("GITHUB_EVENT_NAME"),
        "github_context_sha":os.environ.get("GITHUB_SHA"),
        "pr_head_sha":os.environ.get("GITHUB_SHA"),
        "ref":os.environ.get("GITHUB_REF"),
    }
    path=os.environ.get("GITHUB_EVENT_PATH")
    if path:
        try:
            event=json.load(open(path,encoding="utf-8"))
            sha=((event.get("pull_request") or {}).get("head") or {}).get("sha")
            if sha:
                out["pr_head_sha"]=sha
        except Exception:
            pass
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--pbf",required=True)
    ap.add_argument("--out",required=True)
    ap.add_argument("--max-locality-hint-km",type=float,default=50.0)
    args=ap.parse_args()

    import osmium

    candidates=[]
    admin_refs=[]
    centers=[]

    def names_present(tags):
        return any(tags.get(k) for k in ("name","name:fr","name:ar"))

    def common(obj_type,obj_id,tags,version,timestamp,lon=None,lat=None):
        return {
            "osm_type":obj_type,"osm_id":obj_id,
            "name":tags.get("name"),"name:fr":tags.get("name:fr"),"name:ar":tags.get("name:ar"),
            "alt_name":tags.get("alt_name"),"official_name":tags.get("official_name"),
            "place":tags.get("place"),"boundary":tags.get("boundary"),"admin_level":tags.get("admin_level"),
            "addr:city":tags.get("addr:city"),"addr:suburb":tags.get("addr:suburb"),"is_in":tags.get("is_in"),
            "wikidata":tags.get("wikidata"),"wikipedia":tags.get("wikipedia"),
            "lon":lon,"lat":lat,"version":version,"timestamp":str(timestamp),
        }

    def add_record(obj_type,obj_id,tags,version,timestamp,lon=None,lat=None):
        if not names_present(tags):
            return
        row=common(obj_type,obj_id,tags,version,timestamp,lon,lat)
        if tags.get("place") in PRODUCT_PLACE_VALUES:
            candidates.append({**row,"status":"DISCOVERY_ONLY"})
        if tags.get("boundary")=="administrative" and tags.get("admin_level"):
            admin_refs.append({**row,"status":"REFERENCE_ONLY"})

    class H(osmium.SimpleHandler):
        def node(self,n):
            tags=dict(n.tags)
            lon=lat=None
            if n.location.valid():
                lon=float(n.location.lon); lat=float(n.location.lat)
            if names_present(tags) and tags.get("place") in LOCALITY_PLACE_VALUES and lon is not None:
                centers.append({
                    **common("node",n.id,tags,n.version,n.timestamp,lon,lat),
                    "status":"LOCALITY_ANCHOR_ONLY",
                })
            if tags.get("place") in PRODUCT_PLACE_VALUES or (tags.get("boundary")=="administrative" and tags.get("admin_level")):
                add_record("node",n.id,tags,n.version,n.timestamp,lon,lat)

        def way(self,w):
            tags=dict(w.tags)
            if not (tags.get("place") in PRODUCT_PLACE_VALUES or (tags.get("boundary")=="administrative" and tags.get("admin_level"))):
                return
            # Preserve named way candidates without inventing a centroid.
            # Geometry-bearing ways/relations are resolved later by dedicated gates.
            add_record("way",w.id,tags,w.version,w.timestamp,None,None)

        def relation(self,r):
            tags=dict(r.tags)
            if tags.get("place") in PRODUCT_PLACE_VALUES or (tags.get("boundary")=="administrative" and tags.get("admin_level")):
                add_record("relation",r.id,tags,r.version,r.timestamp)

    H().apply_file(args.pbf,locations=False)

    centers.sort(key=lambda x:((x.get("name") or "").casefold(),x["osm_id"]))
    candidates.sort(key=lambda x:((x.get("name") or x.get("name:fr") or x.get("name:ar") or "").casefold(),x["osm_type"],x["osm_id"]))
    admin_refs.sort(key=lambda x:((x.get("name") or x.get("name:fr") or x.get("name:ar") or "").casefold(),x["osm_type"],x["osm_id"]))

    for row in candidates:
        row["locality_hint"]=None
        if row.get("lat") is None or row.get("lon") is None or not centers:
            continue
        nearest=None
        for center in centers:
            d=haversine_km(row["lat"],row["lon"],center["lat"],center["lon"])
            if nearest is None or d<nearest[0]:
                nearest=(d,center)
        if nearest and nearest[0] <= args.max_locality_hint_km:
            d,center=nearest
            row["locality_hint"]={
                "status":"HINT_ONLY",
                "method":"nearest_named_osm_settlement_node",
                "distance_km":round(d,3),
                "name":center.get("name") or center.get("name:fr") or center.get("name:ar"),
                "place":center.get("place"),
                "osm_type":"node",
                "osm_id":center["osm_id"],
            }

    backlog=defaultdict(list)
    unassigned=[]
    for row in candidates:
        hint=row.get("locality_hint")
        if hint:
            key=f'{hint["place"]}:{hint["osm_id"]}'
            backlog[key].append(row)
        else:
            unassigned.append(row)

    backlog_summary=[]
    center_by_key={f'{c["place"]}:{c["osm_id"]}':c for c in centers}
    for key,rows in backlog.items():
        center=center_by_key[key]
        backlog_summary.append({
            "locality_key":key,
            "locality_name":center.get("name") or center.get("name:fr") or center.get("name:ar"),
            "locality_place":center.get("place"),
            "locality_osm_id":center["osm_id"],
            "lat":center["lat"],"lon":center["lon"],
            "candidate_count":len(rows),
            "candidate_names":[r.get("name") or r.get("name:fr") or r.get("name:ar") for r in rows],
            "status":"HINT_ONLY",
        })
    backlog_summary.sort(key=lambda x:(-x["candidate_count"],(x["locality_name"] or "").casefold()))

    counts={
        "product_candidate_count":len(candidates),
        "product_candidates_by_place":dict(Counter(r.get("place") or "(none)" for r in candidates)),
        "product_candidates_by_osm_type":dict(Counter(r["osm_type"] for r in candidates)),
        "product_candidates_with_coordinates":sum(1 for r in candidates if r.get("lat") is not None and r.get("lon") is not None),
        "product_candidates_with_locality_hint":sum(1 for r in candidates if r.get("locality_hint")),
        "product_candidates_unassigned":len(unassigned),
        "administrative_reference_count":len(admin_refs),
        "urban_center_count":len(centers),
        "backlog_locality_count":len(backlog_summary),
    }

    payload={
        "schema_version":2,
        "scope":"Morocco",
        "purpose":"national-neighborhood-discovery-backlog",
        "source_control":source_control(),
        "counts":counts,
        "guardrails":[
            "Product candidates are discovery labels, not certified real-estate product neighborhoods.",
            "Administrative references are not automatically equivalent to modern product geography.",
            "Nearest-locality assignments are HINT_ONLY and must not be used as certified city membership.",
            "OSM labels and geometry are discovery/materialization evidence, not product truth.",
            "No item may be promoted to a product polygon without independent corroboration, topology checks, membership checks, and review.",
            "Historical/urban-planning sectors must remain distinct from modern product geography unless evidence proves equivalence."
        ],
        "backlog_by_locality":backlog_summary,
        "unassigned_product_candidates":unassigned,
        "product_candidates":candidates,
        "administrative_references":admin_refs,
        "urban_centers":centers,
    }

    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(payload,f,ensure_ascii=False,indent=2)
        f.write("\n")
    print(json.dumps(counts,ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
