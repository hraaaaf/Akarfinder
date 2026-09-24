#!/usr/bin/env python3
"""Polygonize current product-boundary linework without an official area target.

Diagnostic only. Reports closed faces and observed areas. It does not certify
administrative truth and does not invent a reference area.
"""
import argparse, json, math
def area_m2(coords):
    lat0=sum(y for x,y in coords)/len(coords)
    kx=111320*math.cos(math.radians(lat0)); ky=110540
    pts=[(x*kx,y*ky) for x,y in coords]
    return abs(sum(x1*y2-x2*y1 for (x1,y1),(x2,y2) in zip(pts,pts[1:])))/2
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--linework",action="append",required=True)
    ap.add_argument("--territory",required=True)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    from shapely.geometry import LineString
    from shapely.ops import unary_union, polygonize, polygonize_full
    lines=[]
    for path in args.linework:
        data=json.load(open(path,encoding="utf-8"))
        for m in data.get("matches",[]):
            cs=m.get("coordinates") or []
            if len(cs)>=2: lines.append(LineString(cs))
    merged=unary_union(lines)
    polys=list(polygonize(merged))
    _,cuts,dangles,invalids=polygonize_full(merged)
    faces=[]
    for p in polys:
        ring=list(p.exterior.coords)
        faces.append({"area_hectares":round(area_m2(ring)/10000,2),
                      "coordinates":[[float(x),float(y)] for x,y in ring]})
    faces.sort(key=lambda x:-x["area_hectares"])
    out={"territory":args.territory,"authoring_only":True,
         "polygon_count":len(faces),
         "cut_count":len(getattr(cuts,"geoms",[])),
         "dangle_count":len(getattr(dangles,"geoms",[])),
         "invalid_count":len(getattr(invalids,"geoms",[])),
         "faces":faces[:20]}
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(out,f,ensure_ascii=False,indent=2);f.write("\n")
    print(json.dumps({k:v for k,v in out.items() if k!="faces"},ensure_ascii=False,indent=2))
    print(json.dumps(out["faces"][:10],ensure_ascii=False,indent=2))
if __name__=="__main__": main()
