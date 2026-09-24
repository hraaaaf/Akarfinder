#!/usr/bin/env python3
"""Diagnose connected components for authoritative boundary axes."""
import argparse, json, math, unicodedata

def norm(v):
    if not v: return ""
    s=unicodedata.normalize("NFKD",v)
    s="".join(ch for ch in s if not unicodedata.combining(ch))
    return " ".join(s.casefold().replace("’","'").split())

def hav(a,b):
    R=6371000.0
    p1,p2=math.radians(a[1]),math.radians(b[1])
    dp=math.radians(b[1]-a[1]); dl=math.radians(b[0]-a[0])
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--input",required=True)
    ap.add_argument("--axis",action="append",required=True,help="label=query1|query2")
    ap.add_argument("--join-meters",type=float,default=12.0)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()

    data=json.load(open(args.input,encoding="utf-8"))
    rows=data.get("matches",[])
    axes=[]
    for spec in args.axis:
        label,raw=spec.split("=",1)
        qs={norm(x) for x in raw.split("|")}
        axes.append((label,qs))

    out={"input":args.input,"join_meters":args.join_meters,"axes":{}}
    for label,qs in axes:
        segs=[m for m in rows if norm(m.get("query")) in qs and len(m.get("coordinates") or [])>=2]
        n=len(segs)
        parent=list(range(n))
        def find(i):
            while parent[i]!=i:
                parent[i]=parent[parent[i]]; i=parent[i]
            return i
        def union(a,b):
            ra,rb=find(a),find(b)
            if ra!=rb: parent[rb]=ra

        for i in range(n):
            a=segs[i]["coordinates"]
            ea=[a[0],a[-1]]
            for j in range(i+1,n):
                b=segs[j]["coordinates"]
                eb=[b[0],b[-1]]
                if min(hav(x,y) for x in ea for y in eb)<=args.join_meters:
                    union(i,j)

        comps={}
        for i,m in enumerate(segs):
            comps.setdefault(find(i),[]).append(m)
        summaries=[]
        for members in comps.values():
            pts=[p for m in members for p in m["coordinates"]]
            length=0.0
            for m in members:
                cs=m["coordinates"]
                length+=sum(hav(a,b) for a,b in zip(cs,cs[1:]))
            xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
            summaries.append({
                "way_count":len(members),
                "length_m":round(length,1),
                "bbox":[min(xs),min(ys),max(xs),max(ys)],
                "osm_ids":[m.get("osm_id") for m in members],
                "queries":sorted({m.get("query") for m in members}),
                "names":sorted({m.get("name") for m in members if m.get("name")})
            })
        summaries.sort(key=lambda x:(-x["length_m"],-x["way_count"]))
        out["axes"][label]=summaries

    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(out,f,ensure_ascii=False,indent=2); f.write("\n")
    print(json.dumps({k:len(v) for k,v in out["axes"].items()},ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
