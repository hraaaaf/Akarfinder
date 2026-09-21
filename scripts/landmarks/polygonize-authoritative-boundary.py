#!/usr/bin/env python3
"""Polygonize authoritative OSM boundary linework and select by reference area.

No hand-drawn connectors are introduced. The script fails closed unless
polygonization yields a face within the configured area tolerance.
"""
import argparse, json, math

def area_m2(coords):
    lat0=sum(y for x,y in coords)/len(coords)
    kx=111320*math.cos(math.radians(lat0)); ky=110540
    pts=[(x*kx,y*ky) for x,y in coords]
    s=0.0
    for (x1,y1),(x2,y2) in zip(pts,pts[1:]):
        s+=x1*y2-x2*y1
    return abs(s)/2

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--linework", action="append", required=True)
    ap.add_argument("--territory", required=True)
    ap.add_argument("--target-hectares", type=float, required=True)
    ap.add_argument("--tolerance-pct", type=float, default=25.0)
    ap.add_argument("--out", required=True)
    args=ap.parse_args()

    from shapely.geometry import LineString
    from shapely.ops import unary_union, polygonize, polygonize_full

    lines=[]
    provenance=[]
    for path in args.linework:
        data=json.load(open(path,encoding="utf-8"))
        for m in data.get("matches",[]):
            coords=m.get("coordinates") or []
            if len(coords)<2: continue
            lines.append(LineString(coords))
            provenance.append({
                "file":path,
                "osm_id":m.get("osm_id"),
                "name":m.get("name"),
                "old_name":m.get("old_name"),
                "natural":m.get("natural"),
                "query":m.get("query")
            })
    if not lines:
        raise SystemExit("no linework")

    merged=unary_union(lines)
    polys=list(polygonize(merged))
    full_polys, cuts, dangles, invalids = polygonize_full(merged)
    diagnostics={
      "line_count":len(lines),
      "polygon_count":len(polys),
      "cut_count":len(getattr(cuts,"geoms",[])),
      "dangle_count":len(getattr(dangles,"geoms",[])),
      "invalid_count":len(getattr(invalids,"geoms",[])),
    }
    print(json.dumps({"diagnostics":diagnostics},ensure_ascii=False))
    if not polys:
        raise SystemExit("polygonize produced no closed faces; diagnostics="+json.dumps(diagnostics))

    target=args.target_hectares
    ranked=[]
    for p in polys:
        ring=list(p.exterior.coords)
        ha=area_m2(ring)/10000.0
        delta=abs(ha-target)/target*100.0
        ranked.append((delta,ha,p))
    ranked.sort(key=lambda x:x[0])
    delta,ha,p=ranked[0]
    if delta>args.tolerance_pct:
        raise SystemExit(f"no polygon within tolerance: best={ha:.2f} ha delta={delta:.1f}% target={target:.2f} ha")

    out={
      "type":"Feature",
      "properties":{
        "territory":args.territory,
        "authoring_only":True,
        "source_method":"AUC-boundary-recipe+OSM-linework+shapely-polygonize",
        "target_hectares":target,
        "area_hectares":round(ha,2),
        "area_delta_pct":round(delta,2),
        "candidate_face_count":len(polys),
        "source_line_count":len(lines),
        "diagnostics":diagnostics,
        "provenance":provenance
      },
      "geometry":{
        "type":"Polygon",
        "coordinates":[[[float(x),float(y)] for x,y in p.exterior.coords]]
      }
    }
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(out,f,ensure_ascii=False,indent=2); f.write("\n")
    print(json.dumps(out["properties"],ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
