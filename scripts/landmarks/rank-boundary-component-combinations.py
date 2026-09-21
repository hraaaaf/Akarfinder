#!/usr/bin/env python3
"""Enumerate connected-component combinations for authoritative boundary axes.

This is diagnostic/authoring only. For each axis, one component candidate is
selected, then all combinations are tested with controlled endpoint snapping.
No synthetic long edge is introduced. Results are ranked by target-area delta
and residual topology gaps.
"""
import argparse, json, math, itertools

def hav(a,b):
    R=6371000.0
    p1,p2=math.radians(a[1]),math.radians(b[1])
    dp=math.radians(b[1]-a[1]); dl=math.radians(b[0]-a[0])
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))

def area_m2(coords):
    lat0=sum(y for x,y in coords)/len(coords)
    kx=111320*math.cos(math.radians(lat0)); ky=110540
    pts=[(x*kx,y*ky) for x,y in coords]
    s=0.0
    for (x1,y1),(x2,y2) in zip(pts,pts[1:]): s+=x1*y2-x2*y1
    return abs(s)/2

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--ways",required=True)
    ap.add_argument("--components",required=True)
    ap.add_argument("--axis",action="append",required=True,help="label=query1|query2")
    ap.add_argument("--top",type=int,default=4)
    ap.add_argument("--snap-meters",type=float,default=12)
    ap.add_argument("--target-hectares",type=float,required=True)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()

    from shapely.geometry import LineString
    from shapely.ops import unary_union, polygonize, polygonize_full, snap

    ways=json.load(open(args.ways,encoding="utf-8")).get("matches",[])
    comps=json.load(open(args.components,encoding="utf-8"))["axes"]
    axis_specs=[]
    for spec in args.axis:
        label,_=spec.split("=",1)
        cand=comps.get(label,[])[:args.top]
        if not cand:
            raise SystemExit(f"no components for axis {label}")
        axis_specs.append((label,cand))

    byid={m.get("osm_id"):m for m in ways}
    results=[]
    for choice in itertools.product(*[range(len(c)) for _,c in axis_specs]):
        lines=[]; selected={}
        for (label,cands),idx in zip(axis_specs,choice):
            comp=cands[idx]
            selected[label]={"component_index":idx,"length_m":comp["length_m"],"osm_ids":comp["osm_ids"]}
            for oid in comp["osm_ids"]:
                m=byid.get(oid)
                if m and len(m.get("coordinates") or [])>=2:
                    lines.append(LineString(m["coordinates"]))
        if not lines: continue
        merged=unary_union(lines)
        snapped=snap(merged,merged,args.snap_meters/111000.0)
        polys=list(polygonize(snapped))
        _,cuts,dangles,invalids=polygonize_full(snapped)
        best=None
        for p in polys:
            ha=area_m2(list(p.exterior.coords))/10000.0
            delta=abs(ha-args.target_hectares)/args.target_hectares*100
            if best is None or delta<best[0]: best=(delta,ha)
        results.append({
            "choice":selected,
            "polygon_count":len(polys),
            "cut_count":len(getattr(cuts,"geoms",[])),
            "dangle_count":len(getattr(dangles,"geoms",[])),
            "invalid_count":len(getattr(invalids,"geoms",[])),
            "best_area_hectares":None if best is None else round(best[1],2),
            "best_area_delta_pct":None if best is None else round(best[0],2)
        })

    results.sort(key=lambda r:(
      999999 if r["best_area_delta_pct"] is None else r["best_area_delta_pct"],
      r["dangle_count"], r["cut_count"]
    ))
    out={"target_hectares":args.target_hectares,"snap_meters":args.snap_meters,"results":results[:50]}
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(out,f,ensure_ascii=False,indent=2); f.write("\n")
    print(json.dumps(out["results"][:10],ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
