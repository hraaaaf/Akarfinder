#!/usr/bin/env python3
"""Rank closed boundary cycles after trimming each axis between adjacent junctions.

Each axis is built only from OSM ways belonging to one diagnosed component.
Junctions are nearest points between adjacent authoritative axes. A combination
is rejected if any junction gap exceeds --max-gap-m. Axis geometries are then
trimmed between those junctions; only the short <=max-gap snap closes divided-
carriageway/intersection modeling gaps. No long synthetic boundary is allowed.
"""
import argparse, json, math, itertools

def project_xy(lon, lat, lat0):
    return (lon*111320*math.cos(math.radians(lat0)), lat*110540)

def unproject_xy(x,y,lat0):
    return (x/(111320*math.cos(math.radians(lat0))), y/110540)

def area_m2(coords):
    s=0.0
    for (x1,y1),(x2,y2) in zip(coords,coords[1:]):
        s+=x1*y2-x2*y1
    return abs(s)/2

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--ways",required=True)
    ap.add_argument("--components",required=True)
    ap.add_argument("--order",required=True,help="comma-separated axis labels in boundary order")
    ap.add_argument("--top",type=int,default=4)
    ap.add_argument("--max-gap-m",type=float,default=12.0)
    ap.add_argument("--target-hectares",type=float,required=True)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()

    from shapely.geometry import LineString
    from shapely.ops import unary_union, linemerge, nearest_points, substring

    way_rows=json.load(open(args.ways,encoding="utf-8")).get("matches",[])
    byid={m.get("osm_id"):m for m in way_rows}
    comps=json.load(open(args.components,encoding="utf-8"))["axes"]
    order=[x.strip() for x in args.order.split(",") if x.strip()]
    if len(order)<3: raise SystemExit("need >=3 ordered axes")

    allpts=[p for m in way_rows for p in (m.get("coordinates") or [])]
    lat0=sum(p[1] for p in allpts)/len(allpts)

    def axis_geom(comp):
        lines=[]
        for oid in comp["osm_ids"]:
            m=byid.get(oid)
            cs=m.get("coordinates") if m else None
            if cs and len(cs)>=2:
                lines.append(LineString([project_xy(x,y,lat0) for x,y in cs]))
        if not lines: return None
        unioned=unary_union(lines)
        if unioned.geom_type=="LineString":
            merged=unioned
        else:
            merged=linemerge(unioned)
        geoms=list(getattr(merged,"geoms",[merged]))
        geoms=[g for g in geoms if g.geom_type=="LineString" and g.length>0]
        if not geoms: return None
        return max(geoms,key=lambda g:g.length)

    candidates=[]
    for label in order:
        arr=comps.get(label,[])[:args.top]
        if not arr: raise SystemExit(f"no component candidates for {label}")
        candidates.append(arr)

    results=[]
    for choice in itertools.product(*[range(len(a)) for a in candidates]):
        selected={label:{"component_index":idx,"component":candidates[i][idx]}
                  for i,(label,idx) in enumerate(zip(order,choice))}
        geoms=[]
        bad=False
        for label in order:
            g=axis_geom(selected[label]["component"])
            if g is None: bad=True; break
            geoms.append(g)
        if bad: continue

        junctions=[]
        gaps=[]
        for i in range(len(order)):
            a=geoms[i]; b=geoms[(i+1)%len(order)]
            pa,pb=nearest_points(a,b)
            gap=pa.distance(pb)
            junctions.append((pa,pb))
            gaps.append(gap)
        if max(gaps)>args.max_gap_m:
            results.append({
              "choice":{k:v["component_index"] for k,v in selected.items()},
              "accepted":False,
              "max_gap_m":round(max(gaps),2),
              "gaps_m":[round(x,2) for x in gaps],
              "reason":"adjacent-axis gap exceeds limit"
            })
            continue

        pieces=[]
        for i,g in enumerate(geoms):
            prev_pb=junctions[(i-1)%len(order)][1]  # point on this axis from previous junction
            next_pa=junctions[i][0]                 # point on this axis to next axis
            d1=g.project(prev_pb); d2=g.project(next_pa)
            lo,hi=sorted((d1,d2))
            if hi-lo<1.0:
                bad=True; break
            piece=substring(g,lo,hi)
            pieces.append(piece)
        if bad: continue

        ring=[]
        for i,piece in enumerate(pieces):
            cs=list(piece.coords)
            if not ring:
                ring.extend(cs)
            else:
                # Orient so first coordinate is closest to current ring end.
                if math.dist(ring[-1],cs[-1]) < math.dist(ring[-1],cs[0]):
                    cs=list(reversed(cs))
                ring.extend(cs)
            # bridge only within max-gap at the authoritative junction
            nxt=pieces[(i+1)%len(pieces)]
            # orientation of next will be decided later; closure evaluated below

        # Build ordered endpoints again with greedy orientation and tiny bridges.
        ordered=[]
        first=list(pieces[0].coords)
        ordered.extend(first)
        for p in pieces[1:]:
            cs=list(p.coords)
            if math.dist(ordered[-1],cs[-1]) < math.dist(ordered[-1],cs[0]):
                cs=list(reversed(cs))
            gap=math.dist(ordered[-1],cs[0])
            if gap>args.max_gap_m: bad=True; break
            if gap>0: ordered.append(cs[0])
            ordered.extend(cs[1:])
        if bad: continue
        close_gap=math.dist(ordered[-1],ordered[0])
        if close_gap>args.max_gap_m:
            continue
        ordered.append(ordered[0])
        ha=area_m2(ordered)/10000.0
        delta=abs(ha-args.target_hectares)/args.target_hectares*100.0
        results.append({
          "choice":{k:v["component_index"] for k,v in selected.items()},
          "accepted":True,
          "max_gap_m":round(max(gaps+[close_gap]),2),
          "gaps_m":[round(x,2) for x in gaps],
          "area_hectares":round(ha,2),
          "area_delta_pct":round(delta,2),
          "ring":[list(unproject_xy(x,y,lat0)) for x,y in ordered]
        })

    results.sort(key=lambda r:(
      0 if r.get("accepted") else 1,
      r.get("area_delta_pct",999999),
      r.get("max_gap_m",999999)
    ))
    out={"order":order,"target_hectares":args.target_hectares,"max_gap_m":args.max_gap_m,"results":results[:100]}
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(out,f,ensure_ascii=False,indent=2); f.write("\n")
    print(json.dumps(out["results"][:10],ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
