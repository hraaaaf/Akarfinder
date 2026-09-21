#!/usr/bin/env python3
"""Read-only inspection of public Yakeey pages and same-origin JS bundles.

No authentication, no private endpoints, no mutation. Extracts public script
URLs and scans text for map/API/geometry indicators useful for product-boundary
research.
"""
import argparse, json, re, urllib.parse, urllib.request

KEYS = [
    "geojson","polygon","multipolygon","coordinates","latitude","longitude",
    "lat","lng","mapbox","leaflet","google.maps","boundary","district",
    "quartier","neighborhood","api/","graphql","referentiel"
]

def fetch(url):
    req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8","ignore")

def snippets(text, key, radius=180, limit=20):
    out=[]; low=text.casefold(); k=key.casefold(); pos=0
    while len(out)<limit:
        i=low.find(k,pos)
        if i<0: break
        out.append(text[max(0,i-radius):min(len(text),i+len(key)+radius)])
        pos=i+len(key)
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--url",action="append",required=True)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    report=[]
    for url in args.url:
        page=fetch(url)
        scripts=[]
        for src in re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', page, flags=re.I):
            full=urllib.parse.urljoin(url,src)
            if urllib.parse.urlparse(full).netloc.endswith("yakeey.com"):
                scripts.append(full)
        scripts=list(dict.fromkeys(scripts))
        docs=[("html",url,page)]
        for s in scripts[:80]:
            try:
                docs.append(("script",s,fetch(s)))
            except Exception as e:
                docs.append(("script_error",s,str(e)))
        hits=[]
        endpoint_candidates=set()
        coord_candidates=[]
        for kind,src,text in docs:
            if kind=="script_error": continue
            for key in KEYS:
                ss=snippets(text,key,limit=8)
                if ss:
                    hits.append({"source":src,"kind":kind,"key":key,"snippets":ss})
            for m in re.findall(r'https?://[^"\'\s)]+|/[A-Za-z0-9_?=&%./:{}-]{6,}', text):
                ml=m.casefold()
                if any(k in ml for k in ["api","graphql","geo","map","quartier","district","referentiel"]):
                    endpoint_candidates.add(m[:500])
            for m in re.finditer(r'(-?\d{1,3}\.\d{4,})\s*[,;:]\s*(-?\d{1,3}\.\d{4,})', text):
                a,b=float(m.group(1)),float(m.group(2))
                if -180<=a<=180 and -180<=b<=180:
                    coord_candidates.append({"source":src,"pair":[a,b],"context":text[max(0,m.start()-120):m.end()+120]})
                    if len(coord_candidates)>=100: break
        report.append({
            "page":url,
            "script_count":len(scripts),
            "scripts":scripts,
            "endpoint_candidates":sorted(endpoint_candidates)[:300],
            "coordinate_candidates":coord_candidates[:100],
            "hits":hits[:300]
        })
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump({"mode":"public-read-only","pages":report},f,ensure_ascii=False,indent=2);f.write("\n")
    for p in report:
        print("\nPAGE",p["page"])
        print("scripts",p["script_count"])
        print("endpoints",json.dumps(p["endpoint_candidates"][:40],ensure_ascii=False,indent=2))
        print("coords",json.dumps(p["coordinate_candidates"][:20],ensure_ascii=False,indent=2))
if __name__=="__main__": main()
