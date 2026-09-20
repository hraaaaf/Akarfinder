#!/usr/bin/env python3
"""Find OSM ways by exact normalized name from a local PBF.

This is an authoring/discovery helper for reconstructing boundaries explicitly
described by authoritative planning documents. It emits metadata and node refs;
it does not infer or publish a polygon.
"""
import argparse, json, unicodedata

def norm(v):
    if not v: return ""
    s = unicodedata.normalize("NFKD", v)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return " ".join(s.casefold().replace("’","'").split())

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--pbf", required=True)
    ap.add_argument("--name", action="append", required=True)
    ap.add_argument("--out", required=True)
    args=ap.parse_args()

    import osmium
    wanted={norm(x):x for x in args.name}
    rows=[]

    class H(osmium.SimpleHandler):
        def way(self,w):
            tags=dict(w.tags)
            candidates=[tags.get("name"),tags.get("name:fr")]
            matched=None
            for c in candidates:
                if norm(c) in wanted:
                    matched=wanted[norm(c)]
                    break
            if not matched: return
            rows.append({
                "query": matched,
                "osm_type":"way",
                "osm_id":w.id,
                "name":tags.get("name"),
                "name:fr":tags.get("name:fr"),
                "highway":tags.get("highway"),
                "ref":tags.get("ref"),
                "oneway":tags.get("oneway"),
                "version":w.version,
                "timestamp":str(w.timestamp),
                "node_refs":[n.ref for n in w.nodes],
            })

    H().apply_file(args.pbf, locations=False)
    rows.sort(key=lambda r:(norm(r["query"]), r["osm_id"]))
    summary={}
    for q in args.name:
        summary[q]=sum(1 for r in rows if r["query"]==q)
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump({"queries":args.name,"counts":summary,"matches":rows},f,ensure_ascii=False,indent=2)
        f.write("\n")
    print(json.dumps({"counts":summary,"total":len(rows)},ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
