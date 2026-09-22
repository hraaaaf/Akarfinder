#!/usr/bin/env python3
"""Annotate Morocco locality centers with admin-level-4 region containment.

Fail-closed semantics:
- region containment is routing evidence only;
- ambiguous or missing containment remains unresolved;
- no city attachment is decided here;
- no geometry is promoted.
"""
import argparse
import json
from pathlib import Path

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--inventory", required=True)
    ap.add_argument("--region-pbf", required=True)
    ap.add_argument("--out", required=True)
    args=ap.parse_args()

    import osmium
    from shapely.geometry import shape, Point
    from shapely.strtree import STRtree

    data=json.loads(Path(args.inventory).read_text(encoding="utf-8"))
    factory=osmium.geom.GeoJSONFactory()
    records=[]

    class H(osmium.SimpleHandler):
        def area(self, area):
            tags=dict(area.tags)
            if tags.get("boundary")!="administrative" or tags.get("admin_level")!="4":
                return
            try:
                geom=shape(json.loads(factory.create_multipolygon(area)))
            except Exception:
                return
            if geom.is_empty or not geom.is_valid:
                return
            records.append({
                "osm_id":area.orig_id(),
                "osm_source_type":"way" if area.from_way() else "relation",
                "name":tags.get("name"),
                "name:fr":tags.get("name:fr"),
                "name:ar":tags.get("name:ar"),
                "official_name":tags.get("official_name"),
                "wikidata":tags.get("wikidata"),
                "geometry":geom,
            })

    H().apply_file(args.region_pbf, locations=True)
    geoms=[r["geometry"] for r in records]
    tree=STRtree(geoms) if geoms else None

    unique=ambiguous=uncontained=no_coord=0
    for center in data.get("urban_centers",[]):
        center["region_containment"]=None
        if center.get("lat") is None or center.get("lon") is None:
            no_coord+=1
            continue
        if tree is None:
            uncontained+=1
            continue
        pt=Point(float(center["lon"]),float(center["lat"]))
        hits=[]
        for idx in tree.query(pt):
            rec=records[int(idx)]
            if rec["geometry"].covers(pt):
                hits.append(rec)
        public=[{
            "osm_id":h["osm_id"],
            "osm_source_type":h["osm_source_type"],
            "name":h.get("name"),
            "name:fr":h.get("name:fr"),
            "name:ar":h.get("name:ar"),
            "official_name":h.get("official_name"),
            "wikidata":h.get("wikidata"),
            "admin_level":"4",
        } for h in hits]
        if len(public)==1:
            unique+=1
            center["region_containment"]={
                "status":"HINT_ONLY",
                "method":"point_in_osm_admin_level_4",
                "ambiguous":False,
                "matches":public,
            }
        elif len(public)>1:
            ambiguous+=1
            center["region_containment"]={
                "status":"HINT_ONLY",
                "method":"point_in_osm_admin_level_4",
                "ambiguous":True,
                "matches":public,
            }
        else:
            uncontained+=1

    data["schema_version"]=4
    data["purpose"]="national-neighborhood-discovery-backlog-with-admin8-and-region-routing"
    counts=data.setdefault("counts",{})
    counts["urban_centers_region_unique"]=unique
    counts["urban_centers_region_ambiguous"]=ambiguous
    counts["urban_centers_region_uncontained"]=uncontained
    counts["urban_centers_region_no_coordinates"]=no_coord
    data.setdefault("guardrails",[]).append(
        "Admin-level-4 region containment is HINT_ONLY routing evidence and cannot certify city attachment or product geography."
    )

    Path(args.out).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({
        "admin_level_4_reference_count":len(records),
        "urban_centers_region_unique":unique,
        "urban_centers_region_ambiguous":ambiguous,
        "urban_centers_region_uncontained":uncontained,
        "urban_centers_region_no_coordinates":no_coord,
    },ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
