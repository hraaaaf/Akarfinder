#!/usr/bin/env python3
"""NEW OSM PBF snapshot ledger; no historical V5 replay, runtime changes or publication."""
import argparse, hashlib, json, math
from datetime import datetime
from pathlib import Path
from collections import Counter
TAGS={"neighbourhood","suburb","quarter","borough"}

def checksum(path):
    h=hashlib.sha256()
    with Path(path).open("rb") as f:
        for chunk in iter(lambda:f.read(1048576),b""):h.update(chunk)
    return h.hexdigest()
def encoded(obj):
    return json.dumps(obj,sort_keys=True,ensure_ascii=False,separators=(",",":"))
def id_of(props):
    typ=props.get("@type");raw=props.get("@id")
    if typ not in ("node","way","relation") or isinstance(raw,bool):return None
    try:idx=int(raw)
    except (ValueError,TypeError,OverflowError):return None
    return (f"osm:{typ}:{idx}",typ,idx) if 0<idx<=2**53-1 else None
def title(props):
    for name in ("name","name:fr","name:en","official_name","short_name"):
        x=props.get(name)
        if isinstance(x,str) and x.strip():return x.strip()
    return None
def xy(v):
    if not isinstance(v,(list,tuple)) or len(v)<2:return None
    a,b=v[:2]
    if isinstance(a,bool) or isinstance(b,bool) or not all(isinstance(x,(int,float)) and math.isfinite(x) for x in (a,b)):return None
    return (float(a),float(b)) if -180<=a<=180 and -90<=b<=90 else None
def walk(v):
    p=xy(v)
    if p:yield p
    elif isinstance(v,list):
        for z in v:yield from walk(z)
def middle(g):
    if not isinstance(g,dict):return None
    ps=[xy(g.get("coordinates"))] if g.get("type")=="Point" else list(walk(g.get("coordinates")))
    ps=[p for p in ps if p]
    if not ps:return None
    return {"lng":(min(x for x,y in ps)+max(x for x,y in ps))/2,"lat":(min(y for x,y in ps)+max(y for x,y in ps))/2}
def in_ring(point,ring):
    x,y=point;state=False;j=len(ring)-1
    for i in range(len(ring)):
        a=xy(ring[i]);b=xy(ring[j])
        if not a or not b:return False
        if ((a[1]>y)!=(b[1]>y)) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:state=not state
        j=i
    return state
def inside(c,g):
    polys=[g.get("coordinates") or []] if g.get("type")=="Polygon" else (g.get("coordinates") or []) if g.get("type")=="MultiPolygon" else []
    return any(p and in_ring((c["lng"],c["lat"]),p[0]) and not any(in_ring((c["lng"],c["lat"]),h) for h in p[1:]) for p in polys)
def parents(items):
    found=[];errors=[];seen=set()
    for i,f in enumerate(items):
        p=f.get("properties") or {};g=f.get("geometry") or {}
        if p.get("boundary")!="administrative" or str(p.get("admin_level")) not in ("8","9"):continue
        src=id_of(p)
        if not src or src[1]!="relation" or g.get("type") not in ("Polygon","MultiPolygon"):
            errors.append({"index":i,"reason":"invalid_admin_relation"});continue
        if src[0] in seen:
            errors.append({"index":i,"reason":"duplicate_admin_relation"});continue
        seen.add(src[0]);pts=list(walk(g.get("coordinates")))
        if not pts:
            errors.append({"index":i,"reason":"empty_admin_geometry"});continue
        found.append({"sourceId":src[0],"relationId":src[2],"adminLevel":str(p["admin_level"]),
                      "name":title(p),"bbox":(min(x for x,y in pts),min(y for x,y in pts),max(x for x,y in pts),max(y for x,y in pts)),"geometry":g})
    return sorted(found,key=lambda x:x["sourceId"]),errors
def inspect(features,admin,snapshot):
    candidate,admin_issues=parents(admin);seen=set();duplicate=set();ledger=[];source=[]
    for i,f in enumerate(features):
        p=f.get("properties") or {};g=f.get("geometry") or {}
        original=id_of(p);sid=original[0] if original else None
        tag=p.get("place");label=title(p);c=middle(g);issues=[]
        if not original:issues.append("invalid_osm_id")
        elif sid in seen:issues.append("duplicate_osm_id");duplicate.add(sid)
        else:seen.add(sid)
        if tag not in TAGS:issues.append("unsupported_place_tag")
        if not label:issues.append("missing_name")
        if not c:issues.append("missing_center")
        matching=[]
        if c:
            for row in candidate:
                minx,miny,maxx,maxy=row["bbox"]
                if minx<=c["lng"]<=maxx and miny<=c["lat"]<=maxy and inside(c,row["geometry"]):
                    matching.append({k:row[k] for k in ("sourceId","relationId","adminLevel","name")})
        status="none" if not matching else "unique" if len(matching)==1 else "ambiguous_multiple"
        decision="retain_shadow_hold" if not issues else "exclude_from_shadow"
        fingerprint=hashlib.sha256(encoded(f).encode()).hexdigest()
        ledger.append({"index":i,"sourceId":sid,"osmType":original[1] if original else None,
                       "osmId":original[2] if original else None,"placeTag":tag,"name":label,
                       "center":c,"featureSha256":fingerprint,"candidateParentRelations":matching,
                       "parentMethod":"candidate_admin8_9_point_containment","parentStatus":status,
                       "decision":decision,"reasons":issues,"publicationStatus":"hold_no_publication"})
        if not issues:
            source.append({"sourceIdentity":{"id":sid,"osmType":original[1],"osmId":original[2],
                  "placeTag":tag,"featureSha256":fingerprint,"pbfSha256":snapshot["pbfSha256"],"license":"ODbL-1.0"},
                "label":{"name":label,"center":c},
                "parentProvenance":{"candidateRelations":matching,"status":status,"officialNeighborhoodBoundary":False},
                "review":{"publicationStatus":"hold_no_publication","mapEligible":False,
                          "neighborhoodPolygon":None,"districtListingFilterAllowed":False}})
    invalid=sum("invalid_osm_id" in row["reasons"] for row in ledger)
    errors=[]
    if invalid:errors.append("invalid_original_ids:"+str(invalid))
    if duplicate:errors.append("duplicate_original_ids:"+str(len(duplicate)))
    if admin_issues:errors.append("invalid_admin_candidates:"+str(len(admin_issues)))
    ledger.sort(key=lambda x:(x["sourceId"] or "",x["index"]))
    source.sort(key=lambda x:x["sourceIdentity"]["id"])
    return {"schema":"akarfinder_osm_new_snapshot_v6_shadow",
      "status":"shadow_only_pass" if not errors else "blocked_integrity",
      "snapshot":snapshot,
      "counts":{"input":len(features),"ledger":len(ledger),"retained":len(source),"excluded":len(ledger)-len(source),
                "adminCandidateRelations":len(candidate),"decisions":dict(Counter(x["decision"] for x in ledger))},
      "integrityErrors":errors,"candidateAdminIssues":admin_issues,
      "safety":{"allFeaturesAccounted":len(features)==len(ledger),
                "originalIdsPresent":invalid==0,"originalIdsUnique":not duplicate,
                "mapEligibleAdded":0,"publishedNeighborhoodPolygons":0,"districtFiltersAdded":0},
      "historical2026V5":{"isReplay":False,"missing252OsmIds":None,"omissionReasons":None}},ledger,source
def geo(path):
    o=json.loads(Path(path).read_text())
    if not isinstance(o,dict) or o.get("type")!="FeatureCollection" or not isinstance(o.get("features"),list):raise ValueError("Missing FeatureCollection")
    return o["features"]
def main(args=None):
    p=argparse.ArgumentParser()
    for field in ("pbf","neighborhoods","boundaries","output","downloaded-at"):p.add_argument("--"+field,required=True)
    p.add_argument("--published-md5",default="")
    p.add_argument("--osmium-version",default="unknown")
    a=p.parse_args(args)
    dt=datetime.fromisoformat(a.downloaded_at.replace("Z","+00:00"))
    if not dt.tzinfo or dt.utcoffset().total_seconds()!=0:raise ValueError("UTC timestamp required")
    snap={"pbfSha256":checksum(a.pbf),"pbfBytes":Path(a.pbf).stat().st_size,
          "sourceUrl":"https://download.geofabrik.de/africa/morocco-latest.osm.pbf",
          "publishedMd5VerifiedByWorkflow":a.published_md5 or None,"downloadedAtUtc":a.downloaded_at,
          "osmiumVersion":a.osmium_version,"neighborhoodInputSha256":checksum(a.neighborhoods),
          "adminInputSha256":checksum(a.boundaries),"builderSha256":checksum(__file__),
          "newSnapshotNotHistoricReplay":True}
    manifest,ledger,source=inspect(geo(a.neighborhoods),geo(a.boundaries),snap)
    out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
    for typ,rows in (("ledger",ledger),("sources",source)):
        file=out/("v6-"+typ+".jsonl")
        file.write_text("".join(encoded(row)+"\n" for row in rows),encoding="utf8")
        manifest[typ+"Sha256"]=checksum(file)
    (out/"v6-manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False,sort_keys=True)+"\n")
    print(json.dumps({"status":manifest["status"],"counts":manifest["counts"],"PBF_SHA256":snap["pbfSha256"],"errors":manifest["integrityErrors"]}))
    if manifest["integrityErrors"]:raise SystemExit(2)
    return manifest
if __name__=="__main__":main()
