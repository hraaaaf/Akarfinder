#!/usr/bin/env python3
"""Diagnose nearest-junction graph between authoritative boundary axes.

Builds no polygon. It reports pairwise minimum distances between axis component
candidates so the boundary order can be inferred from actual OSM adjacency.
"""
import argparse, json, math, itertools
def hav(a,b):
    R=6371000.0
    p1,p2=math.radians(a[1]),math.radians(b[1])
    dp=math.radians(b[1]-a[1]); dl=math.radians(b[0]-a[0])
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--ways",required=True)
    ap.add_argument("--components",required=True)
    ap.add_argument("--top",type=int,default=3)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    ways=json.load(open(args.ways,encoding="utf-8")).get("matches",[])
    byid={m.get("osm_id"):m for m in ways}
    axes=json.load(open(args.components,encoding="utf-8"))["axes"]
    comp_pts={}
    for label,arr in axes.items():
        comp_pts[label]=[]
        for comp in arr[:args.top]:
            pts=[p for oid in comp["osm_ids"] for p in (byid.get(oid,{}).get("coordinates") or [])]
            comp_pts[label].append(pts)
    rows=[]
    labels=sorted(comp_pts)
    for a,b in itertools.combinations(labels,2):
        best=None
        for ia,pa in enumerate(comp_pts[a]):
            for ib,pb in enumerate(comp_pts[b]):
                if not pa or not pb: continue
                d=min(hav(x,y) for x in pa for y in pb)
                cand=(d,ia,ib)
                if best is None or cand<best: best=cand
        if best:
            rows.append({"axis_a":a,"axis_b":b,"min_distance_m":round(best[0],1),
                         "component_a":best[1],"component_b":best[2]})
    rows.sort(key=lambda r:r["min_distance_m"])
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump({"pairs":rows},f,ensure_ascii=False,indent=2); f.write("\n")
    print(json.dumps(rows[:30],ensure_ascii=False,indent=2))
if __name__=="__main__": main()
