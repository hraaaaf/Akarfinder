#!/usr/bin/env python3
"""Analyze a private OSM QA export. Never certifies business opening or quartier membership."""
import argparse
import json
import math
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

EXPECTED = {"education", "groceries", "health", "transport", "green_sport", "shopping"}
REFERENCE = (33.5898, -7.644)
def distance(a, b):
    lat1, lon1, lat2, lon2 = a[0], a[1], b[0], b[1]
    r = math.pi / 180
    x = math.sin((lat2 - lat1) * r / 2)**2 + math.cos(lat1*r) * math.cos(lat2*r) * math.sin((lon2-lon1)*r/2)**2
    return 12742000*math.asin(min(1, math.sqrt(x)))
def norm_name(s):
    s = unicodedata.normalize("NFKD", s.casefold())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w]+", " ", s, flags=re.UNICODE).strip()
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()
    src = json.loads(args.input.read_text(encoding="utf8"))
    if src.get("schema") != "AKARFINDER_MAARIF_OSM_PBF_QA_V1":
        raise RuntimeError("wrong schema")
    guard=src["publication_guard"]
    if not src["source"]["md5_verified"] or src["status"]!="QA_CANDIDATES_NOT_PUBLISHABLE" or guard.get("eligible") is not False or guard.get("db_write") is not False or guard.get("no_ui_publication") is not True:
        raise RuntimeError("source/publication guards rejected")
    pois = src.get("candidates")
    if not isinstance(pois, list) or len(pois) != src["candidates_count"]: raise RuntimeError("count mismatch")
    keys=set(); by_category=defaultdict(list); invalid=[]; mismatched=[]
    for q in pois:
        k=q.get("source_id")
        if not isinstance(k,str) or not re.fullmatch(r"(node|way|relation)/[1-9]\d*",k) or k in keys:
            invalid.append({"id":k,"reason":"duplicate_or_invalid_identity"})
            continue
        keys.add(k)
        if q.get("category") not in EXPECTED: invalid.append({"id":k,"reason":"unsupported_category"}); continue
        if not q.get("name_osm", "").strip(): invalid.append({"id":k,"reason":"missing_name"}); continue
        if q.get("source_url") != "https://www.openstreetmap.org/"+k: invalid.append({"id":k,"reason":"invalid_provenance"}); continue
        if not (isinstance(q.get("latitude"),(int,float)) and isinstance(q.get("longitude"),(int,float))):
            invalid.append({"id":k,"reason":"invalid_coordinates"});continue
        d=distance(REFERENCE,(q["latitude"],q["longitude"]))
        if d>1800.5: invalid.append({"id":k,"reason":"outside_radius"}); continue
        if abs(d-q.get("distance_from_center_m",-999))>2:
            mismatched.append(k)
        for flag in ("current_operation_verified","position_precision_independently_verified","central_quarter_membership_certified"):
            if q.get(flag) is not False: invalid.append({"id":k,"reason":"forbidden_certification:"+flag})
        by_category[q["category"]].append(q)
    if invalid or mismatched: raise RuntimeError(json.dumps({"invalid":invalid[:20],"mismatched":mismatched[:20]}))
    close_pairs=[]
    exact_norm_pairs=[]
    type_pairs=Counter()
    for category, items in by_category.items():
        for i,a in enumerate(items):
            for b in items[i+1:]:
                gap=distance((a["latitude"],a["longitude"]),(b["latitude"],b["longitude"]))
                if gap <= 50:
                    pair={
                        "a":a["source_id"],"b":b["source_id"],
                        "category":category,
                        "names":[a["name_osm"],b["name_osm"]],
                        "distance_m":round(gap,1),
                        "same_normalized_name":norm_name(a["name_osm"])==norm_name(b["name_osm"]),
                        "decision":"manual_review_no_auto_delete"
                    }
                    close_pairs.append(pair)
                    type_pairs[(a["source_id"].split("/")[0], b["source_id"].split("/")[0])]+=1
                    if pair["same_normalized_name"]: exact_norm_pairs.append(pair)
    # Review 4 nearest well-formed distinct-name anchors per category; this is a *candidate list*, not published.
    shortlist={}
    for category,items in sorted(by_category.items()):
        selected=[]; seen=set()
        for q in sorted(items,key=lambda x:(x["distance_from_center_m"],x["source_id"])):
            n=norm_name(q["name_osm"])
            if len(n)<3 or n in seen:continue
            seen.add(n)
            selected.append({
                "source_id":q["source_id"],"source_url":q["source_url"],
                "name_osm":q["name_osm"],"distance_from_center_m":q["distance_from_center_m"],
                "position_method":q["location_method"],
                "independent_identity_check":"PENDING",
                "independent_coordinate_check":"PENDING",
                "operational_status_check":"PENDING",
                "central_quarter_membership":"NOT_CERTIFIED",
            })
            if len(selected)==4:break
        shortlist[category]=selected
    categories_with_no_candidates=sorted(EXPECTED-set(by_category))
    report={
        "schema":"AKARFINDER_MAARIF_OSM_PBF_QUALIFICATION_V1",
        "generated_at":datetime.now(timezone.utc).isoformat(),
        "source_md5":src["source"]["md5"],
        "snapshot":src["source"],
        "status":"QA_STRUCTURAL_ONLY_NOT_PUBLISHABLE",
        "structural_pass":not invalid and not mismatched and not categories_with_no_candidates,
        "publishable":False,
        "candidate_count":len(pois),
        "category_counts":dict(sorted((k,len(v)) for k,v in by_category.items())),
        "missing_categories":categories_with_no_candidates,
        "duplicate_osm_ids":0,
        "near_pairs_50m":len(close_pairs),
        "near_pairs_same_normalized_name":len(exact_norm_pairs),
        "near_pairs_involving_geometries":dict((str(k),v) for k,v in type_pairs.items()),
        "close_pair_candidates":sorted(close_pairs,key=lambda x:(x["distance_m"],x["category"]))[:100],
        "close_pairs_truncated":len(close_pairs)>100,
        "review_shortlist_count":sum(map(len,shortlist.values())),
        "review_shortlist":shortlist,
        "verified_current_operation_count":0,
        "verified_independent_coordinate_count":0,
        "central_quarter_membership_certified_count":0,
        "important": [
          "OSM dataset replication is not evidence a business still operates.",
          "A centroid or point within 1800m does not certify an arrondissement or a central quartier polygon.",
          "Two POIs under 50m are not necessarily a duplicate; no automatic deletion is performed.",
          "Ways/relations may describe the same venue as nodes; identity verification is mandatory.",
          "Attribution OSM and ODbL database obligations require separate legal review.",
          "The shortlist is ONLY a prioritized review queue. No POIs are approved for publication."
        ],
    }
    args.out_dir.mkdir(parents=True,exist_ok=True)
    (args.out_dir/"maarif-pbf-quality-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    (args.out_dir/"maarif-pbf-review-shortlist-private.json").write_text(json.dumps({
        "schema":"AKARFINDER_MAARIF_OSM_PRIVATE_REVIEW_QUEUE_V1",
        "status":"PRIVATE_PENDING_INDEPENDENT_REVIEW",
        "generated_at":report["generated_at"],
        "shortlist":shortlist,
        "no_publication":True,
    },ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(json.dumps({k:report[k] for k in ("status","structural_pass","publishable","candidate_count","category_counts","near_pairs_50m","near_pairs_same_normalized_name","review_shortlist_count","verified_current_operation_count","verified_independent_coordinate_count")},ensure_ascii=False,indent=2))
if __name__=="__main__":main()
