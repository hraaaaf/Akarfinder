#!/usr/bin/env python3
"""Polygonize authoritative road linework with controlled endpoint snapping.

Only existing OSM line endpoints may be snapped, within a small metric tolerance,
to absorb divided-carriageway/intersection modeling gaps. No new long connector
or synthetic boundary edge is created.
"""
import argparse, json, math

def project(pt, lat0):
    x,y=pt
    return (x*111320*math.cos(math.radians(lat0)), y*110540)

def unproject(pt, lat0):
    x,y=pt
    return (x/(111320*math.cos(math.radians(lat0))), y/110540)

def area_m2(coords):
    lat0=sum(y for x,y in coords)/len(coords)
    pts=[project(p,lat0) for p in coords]
    s=0.0
    for (x1,y1),(x2,y2) in zip(pts,pts[1:]): s+=x1*y2-x2*y1
    return abs(s)/2

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--linework", action="append", required=True)
    ap.add_argument("--territory", required=True)
    ap.add_argument("--target-hectares", type=float, required=True)
    ap.add_argument("--snap-meters", type=float, default=12.0)
    ap.add_argument("--tolerance-pct", type=float, default=25.0)
    ap.add_argument("--out", required=True)
    args=ap.parse_args()

    from shapely.geometry import LineString
    from shapely.ops import unary_union, polygonize, polygonize_full

    raw=[]
    for path in args.linework:
        data=json.load(open(path,encoding="utf-8"))
        for m in data.get("matches",[]):
            coords=m.get("coordinates") or []
            if len(coords)>=2: raw.append(coords)
    if not raw: raise SystemExit("no linework")

    lat0=sum(p[1] for line in raw for p in line)/sum(len(line) for line in raw)
    metric=[[project(p,lat0) for p in line] for line in raw]

    # Cluster only line endpoints that are within snap tolerance.
    endpoints=[]
    for li,line in enumerate(metric):
        endpoints.append((li,0,line[0]))
        endpoints.append((li,-1,line[-1]))

    parent=list(range(len(endpoints)))
    def find(i):
        while parent[i]!=i:
            parent[i]=parent[parent[i]]; i=parent[i]
        return i
    def union(a,b):
        ra,rb=find(a),find(b)
        if ra!=rb: parent[rb]=ra

    tol=args.snap_meters
    for i in range(len(endpoints)):
        x1,y1=endpoints[i][2]
        for j in range(i+1,len(endpoints)):
            x2,y2=endpoints[j][2]
            if (x1-x2)**2+(y1-y2)**2 <= tol*tol:
                union(i,j)

    groups={}
    for i,(_,_,p) in enumerate(endpoints):
        groups.setdefault(find(i),[]).append(p)
    centers={g:(sum(x for x,y in ps)/len(ps),sum(y for x,y in ps)/len(ps)) for g,ps in groups.items()}

    endpoint_index={(li,pos):i for i,(li,pos,p) in enumerate(endpoints)}
    snapped=[]
    snap_count=0
    for li,line in enumerate(metric):
        l=list(line)
        for pos in (0,-1):
            i=endpoint_index[(li,pos)]
            center=centers[find(i)]
            if l[pos]!=center: snap_count+=1
            l[pos]=center
        snapped.append(LineString(l))

    merged=unary_union(snapped)
    polys=list(polygonize(merged))
    _,cuts,dangles,invalids=polygonize_full(merged)
    diag={
      "source_line_count":len(snapped),
      "endpoint_snap_count":snap_count,
      "snap_meters":tol,
      "polygon_count":len(polys),
      "cut_count":len(getattr(cuts,"geoms",[])),
      "dangle_count":len(getattr(dangles,"geoms",[])),
      "invalid_count":len(getattr(invalids,"geoms",[]))
    }
    print(json.dumps({"diagnostics":diag},ensure_ascii=False))
    if not polys:
        raise SystemExit("no closed faces after controlled endpoint snapping")

    ranked=[]
    for p in polys:
        coords=[unproject(q,lat0) for q in p.exterior.coords]
        ha=area_m2(coords)/10000
        delta=abs(ha-args.target_hectares)/args.target_hectares*100
        ranked.append((delta,ha,p))
    ranked.sort(key=lambda x:x[0])
    delta,ha,p=ranked[0]
    if delta>args.tolerance_pct:
        raise SystemExit(f"no polygon within tolerance after snapping: best={ha:.2f} ha delta={delta:.1f}%")

    ring=[unproject(q,lat0) for q in p.exterior.coords]
    out={"type":"Feature","properties":{
      "territory":args.territory,
      "authoring_only":True,
      "source_method":"AUC+OSM+controlled-endpoint-snapping",
      "target_hectares":args.target_hectares,
      "area_hectares":round(ha,2),
      "area_delta_pct":round(delta,2),
      "diagnostics":diag
    },"geometry":{"type":"Polygon","coordinates":[ring]}}
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(out,f,ensure_ascii=False,indent=2); f.write("\n")
    print(json.dumps(out["properties"],ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
