#!/usr/bin/env python3
"""Build an authoring polygon from authoritative named boundary ways.

The recipe comes from an authoritative planning source. This script only
assembles OSM way coordinates that match the declared boundary ingredients.
It fails closed when required ingredients are missing or topology cannot close.
"""
import argparse, json, math
from collections import defaultdict

def hav(a,b):
    R=6371000.0
    p1,p2=math.radians(a[1]),math.radians(b[1])
    dp=math.radians(b[1]-a[1]); dl=math.radians(b[0]-a[0])
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))

def polygon_area_m2(ring):
    if len(ring)<4: return 0.0
    lat0=sum(p[1] for p in ring)/len(ring)
    kx=111320*math.cos(math.radians(lat0)); ky=110540
    pts=[(p[0]*kx,p[1]*ky) for p in ring]
    s=0.0
    for (x1,y1),(x2,y2) in zip(pts,pts[1:]):
        s+=x1*y2-x2*y1
    return abs(s)/2

def merge_segments(segments, tolerance_m=25):
    segs=[list(s) for s in segments if len(s)>=2]
    if not segs: return None
    ring=segs.pop(0)
    while segs:
        candidates=[]
        for i,s in enumerate(segs):
            d=[
                (hav(ring[-1],s[0]),i,False,False),
                (hav(ring[-1],s[-1]),i,True,False),
                (hav(ring[0],s[-1]),i,False,True),
                (hav(ring[0],s[0]),i,True,True),
            ]
            candidates.extend(d)
        dist,i,rev,prepend=min(candidates,key=lambda x:x[0])
        if dist>tolerance_m: return None
        s=segs.pop(i)
        if rev: s=list(reversed(s))
        if prepend: ring=s[:-1]+ring
        else: ring=ring+s[1:]
    if hav(ring[0],ring[-1])>tolerance_m: return None
    ring[-1]=ring[0]
    return ring

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--input",required=True)
    ap.add_argument("--territory",required=True)
    ap.add_argument("--required",action="append",default=[])
    ap.add_argument("--target-hectares",type=float)
    ap.add_argument("--tolerance-pct",type=float,default=25.0)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()

    data=json.load(open(args.input,encoding="utf-8"))
    byq=defaultdict(list)
    for m in data.get("matches",[]):
        if m.get("coordinates"):
            byq[m.get("query")].append(m["coordinates"])
    missing=[q for q in args.required if not byq.get(q)]
    if missing:
        raise SystemExit("missing required boundary ingredients: "+", ".join(missing))

    segments=[]
    for q in args.required:
        segments.extend(byq[q])
    ring=merge_segments(segments)
    if not ring:
        raise SystemExit("topology did not close from required boundary ways")

    area=polygon_area_m2(ring); ha=area/10000.0
    if args.target_hectares:
        delta=abs(ha-args.target_hectares)/args.target_hectares*100
        if delta>args.tolerance_pct:
            raise SystemExit(f"area mismatch: {ha:.2f} ha vs {args.target_hectares:.2f} ha ({delta:.1f}%)")
    else:
        delta=None

    out={
      "type":"Feature",
      "properties":{
        "territory":args.territory,
        "authoring_only":True,
        "source_method":"authoritative-road-recipe+OSM-way-assembly",
        "area_hectares":round(ha,2),
        "target_hectares":args.target_hectares,
        "area_delta_pct":None if delta is None else round(delta,2)
      },
      "geometry":{"type":"Polygon","coordinates":[ring]}
    }
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(out,f,ensure_ascii=False,indent=2); f.write("\n")
    print(json.dumps(out["properties"],ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
