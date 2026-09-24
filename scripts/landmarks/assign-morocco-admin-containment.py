#!/usr/bin/env python3
"""Enrich Morocco neighborhood discovery inventory with admin-level-8 containment.

This is evidence routing only. A containing OSM administrative boundary helps
group candidates operationally, but does not certify product taxonomy or a
modern real-estate neighborhood boundary.
"""
import argparse, json
from collections import defaultdict
from pathlib import Path

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--inventory", required=True)
    ap.add_argument("--admin-pbf", required=True)
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
            if tags.get("boundary")!="administrative" or tags.get("admin_level")!="8":
                return
            try:
                geom=shape(json.loads(factory.create_multipolygon(area)))
            except Exception:
                return
            if geom.is_empty or not geom.is_valid:
                return
            records.append({
                "osm_id": area.orig_id(),
                "osm_source_type": "way" if area.from_way() else "relation",
                "name": tags.get("name"),
                "name:fr": tags.get("name:fr"),
                "name:ar": tags.get("name:ar"),
                "official_name": tags.get("official_name"),
                "boundary": tags.get("boundary"),
                "admin_level": tags.get("admin_level"),
                "wikidata": tags.get("wikidata"),
                "geometry": geom,
            })

    H().apply_file(args.admin_pbf, locations=True)

    geoms=[r["geometry"] for r in records]
    tree=STRtree(geoms) if geoms else None

    grouped=defaultdict(list)
    unique=ambiguous=uncontained=no_coord=0

    for row in data.get("product_candidates",[]):
        row["admin_level_8_containment"]=None
        if row.get("lat") is None or row.get("lon") is None:
            no_coord+=1
            continue
        if tree is None:
            uncontained+=1
            continue

        pt=Point(float(row["lon"]), float(row["lat"]))
        hits=[]
        for idx in tree.query(pt):
            rec=records[int(idx)]
            if rec["geometry"].covers(pt):
                hits.append(rec)

        public_hits=[{
            "osm_id":h["osm_id"],
            "osm_source_type":h["osm_source_type"],
            "name":h.get("name"),
            "name:fr":h.get("name:fr"),
            "name:ar":h.get("name:ar"),
            "official_name":h.get("official_name"),
            "admin_level":"8",
        } for h in hits]

        if len(public_hits)==1:
            unique+=1
            hit=public_hits[0]
            row["admin_level_8_containment"]={
                "status":"HINT_ONLY",
                "method":"point_in_osm_admin_level_8",
                "ambiguous":False,
                "matches":public_hits,
            }
            key=f'{hit["osm_source_type"]}:{hit["osm_id"]}'
            grouped[key].append(row)
        elif len(public_hits)>1:
            ambiguous+=1
            row["admin_level_8_containment"]={
                "status":"HINT_ONLY",
                "method":"point_in_osm_admin_level_8",
                "ambiguous":True,
                "matches":public_hits,
            }
        else:
            uncontained+=1

    rec_by_key={f'{r["osm_source_type"]}:{r["osm_id"]}':r for r in records}
    backlog=[]
    for key, rows in grouped.items():
        rec=rec_by_key[key]
        backlog.append({
            "admin_key":key,
            "admin_name":rec.get("name") or rec.get("name:fr") or rec.get("name:ar"),
            "admin_name_fr":rec.get("name:fr"),
            "admin_name_ar":rec.get("name:ar"),
            "admin_level":"8",
            "admin_osm_id":rec["osm_id"],
            "admin_osm_source_type":rec["osm_source_type"],
            "candidate_count":len(rows),
            "candidate_names":[r.get("name") or r.get("name:fr") or r.get("name:ar") for r in rows],
            "status":"HINT_ONLY",
        })
    backlog.sort(key=lambda x:(-x["candidate_count"], (x["admin_name"] or "").casefold()))

    data["schema_version"]=3
    data["purpose"]="national-neighborhood-discovery-backlog-with-admin-containment"
    data["backlog_by_admin_level_8"]=backlog
    data["admin_level_8_reference_count"]=len(records)
    counts=data.setdefault("counts",{})
    counts["product_candidates_admin8_unique"]=unique
    counts["product_candidates_admin8_ambiguous"]=ambiguous
    counts["product_candidates_admin8_uncontained"]=uncontained
    counts["product_candidates_admin8_no_coordinates"]=no_coord
    counts["backlog_admin8_count"]=len(backlog)
    data.setdefault("guardrails",[]).append(
        "Admin-level-8 containment is HINT_ONLY: it groups evidence operationally but does not certify product taxonomy or modern neighborhood geometry."
    )

    Path(args.out).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({
        "admin_level_8_reference_count":len(records),
        "unique":unique,
        "ambiguous":ambiguous,
        "uncontained":uncontained,
        "no_coordinates":no_coord,
        "backlog_admin8_count":len(backlog),
        "top_backlog":backlog[:20],
    },ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
