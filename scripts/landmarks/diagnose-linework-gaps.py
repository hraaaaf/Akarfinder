#!/usr/bin/env python3
"""Report nearest gaps between two or more linework files.

Diagnostic only: no snapping, no connectors, no polygon creation.
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
    ap.add_argument("--linework",action="append",required=True)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    groups=[]
    for path in args.linework:
        data=json.load(open(path,encoding="utf-8"))
        segs=[]
        for m in data.get("matches",[]):
            cs=m.get("coordinates") or []
            if len(cs)>=2:
                segs.append({"osm_id":m.get("osm_id"),"name":m.get("name") or m.get("natural"),"coords":cs})
        groups.append((path,segs))
    rows=[]
    for (pa,ga),(pb,gb) in itertools.combinations(groups,2):
        best=[]
        for a in ga:
            for b in gb:
                ptsa=[a["coords"][0],a["coords"][-1]]
                ptsb=[b["coords"][0],b["coords"][-1]]
                d=min(hav(x,y) for x in ptsa for y in ptsb)
                best.append((d,a,b))
        best.sort(key=lambda x:x[0])
        rows.append({
          "a":pa,"b":pb,
          "nearest":[{"distance_m":round(d,1),"a_osm_id":a["osm_id"],"a_name":a["name"],
                      "b_osm_id":b["osm_id"],"b_name":b["name"]}
                     for d,a,b in best[:20]]
        })
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump({"pairs":rows},f,ensure_ascii=False,indent=2); f.write("\n")
    print(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=="__main__": main()
