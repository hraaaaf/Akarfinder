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
    ap.add_argument("--contains", action="append", default=[])
    ap.add_argument("--out", required=True)
    args=ap.parse_args()

    import osmium
    wanted={norm(x):x for x in args.name}
    contains=[norm(x) for x in args.contains]
    rows=[]

    class H(osmium.SimpleHandler):
        def way(self,w):
            tags=dict(w.tags)
            candidates=[
                tags.get("name"), tags.get("name:fr"),
                tags.get("old_name"), tags.get("old_name:fr"),
                tags.get("alt_name")
            ]
            matched=None
            match_mode="exact"
            for candidate in candidates:
                if norm(candidate) in wanted:
                    matched=wanted[norm(candidate)]
                    break
            if not matched and contains:
                normalized_candidates=[norm(x) for x in candidates if x]
                for term in contains:
                    if any(term in x for x in normalized_candidates):
                        matched=term
                        match_mode="contains"
                        break
            if not matched: return
            rows.append({
                "query": matched,
                "match_mode": match_mode,
                "osm_type":"way",
                "osm_id":w.id,
                "name":tags.get("name"),
                "name:fr":tags.get("name:fr"),
                "old_name":tags.get("old_name"),
                "old_name:fr":tags.get("old_name:fr"),
                "alt_name":tags.get("alt_name"),
                "highway":tags.get("highway"),
                "ref":tags.get("ref"),
                "oneway":tags.get("oneway"),
                "version":w.version,
                "timestamp":str(w.timestamp),
                "node_refs":[n.ref for n in w.nodes],
                "coordinates":[[n.lon, n.lat] for n in w.nodes if n.location.valid()],
            })

    H().apply_file(args.pbf, locations=True)
    rows.sort(key=lambda r:(norm(r["query"]), r["osm_id"]))
    summary={}
    for q in args.name:
        summary[q]=sum(1 for r in rows if r["query"]==q)
    contains_summary={}
    for q in args.contains:
        nq=norm(q)
        contains_summary[q]=sum(1 for r in rows if r["query"]==nq and r["match_mode"]=="contains")
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump({
            "queries":args.name,
            "contains_queries":args.contains,
            "counts":summary,
            "contains_counts":contains_summary,
            "matches":rows
        },f,ensure_ascii=False,indent=2)
        f.write("\n")
    print(json.dumps({
        "counts":summary,
        "contains_counts":contains_summary,
        "total":len(rows)
    },ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
