#!/usr/bin/env python3
"""Read-only inspection of public Yakeey pages and same-origin JS bundles.

No authentication, no private endpoints, no anti-bot bypass, no mutation.
Always writes a diagnostic artifact, including when public requests are denied.
"""
import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

KEYS = [
    "geojson","polygon","multipolygon","coordinates","latitude","longitude",
    "lat","lng","mapbox","leaflet","google.maps","boundary","district",
    "quartier","neighborhood","api/","graphql","referentiel"
]

def fetch(url):
    req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8","ignore")

def error_record(url, exc):
    out={
        "page":url,
        "status":"inaccessible",
        "error_type":type(exc).__name__,
        "error":str(exc),
        "script_count":0,
        "scripts":[],
        "endpoint_candidates":[],
        "coordinate_candidates":[],
        "hits":[],
        "geometry_claim":"none",
    }
    if isinstance(exc, urllib.error.HTTPError):
        out["http_status"]=exc.code
    return out

def snippets(text, key, radius=180, limit=20):
    out=[]; low=text.casefold(); k=key.casefold(); pos=0
    while len(out)<limit:
        i=low.find(k,pos)
        if i<0: break
        out.append(text[max(0,i-radius):min(len(text),i+len(key)+radius)])
        pos=i+len(key)
    return out

def inspect_page(url):
    try:
        page=fetch(url)
    except Exception as exc:
        return error_record(url, exc)

    scripts=[]
    for src in re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', page, flags=re.I):
        full=urllib.parse.urljoin(url,src)
        if urllib.parse.urlparse(full).netloc.endswith("yakeey.com"):
            scripts.append(full)
    scripts=list(dict.fromkeys(scripts))
    docs=[("html",url,page)]
    script_errors=[]
    for s in scripts[:80]:
        try:
            docs.append(("script",s,fetch(s)))
        except Exception as exc:
            script_errors.append({
                "source":s,
                "error_type":type(exc).__name__,
                "error":str(exc),
                **({"http_status":exc.code} if isinstance(exc, urllib.error.HTTPError) else {}),
            })

    hits=[]
    endpoint_candidates=set()
    coord_candidates=[]
    for kind,src,text in docs:
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

    return {
        "page":url,
        "status":"accessible",
        "script_count":len(scripts),
        "scripts":scripts,
        "script_errors":script_errors,
        "endpoint_candidates":sorted(endpoint_candidates)[:300],
        "coordinate_candidates":coord_candidates[:100],
        "hits":hits[:300],
        "geometry_claim":"none",
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--url",action="append",required=True)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()

    report=[inspect_page(url) for url in args.url]
    accessible=sum(1 for p in report if p["status"]=="accessible")
    if accessible==len(report):
        status="accessible"
    elif accessible:
        status="partial"
    else:
        status="inaccessible"

    out={
        "mode":"public-read-only",
        "status":status,
        "geometry_claim":"none",
        "guardrail":"No auth/anti-bot bypass. Search-indexed taxonomy is not polygon evidence.",
        "pages":report,
    }
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(out,f,ensure_ascii=False,indent=2); f.write("\n")

    print(json.dumps({
        "status":status,
        "accessible_pages":accessible,
        "total_pages":len(report),
        "geometry_claim":"none",
        "output":args.out,
    },ensure_ascii=False,indent=2))
    for p in report:
        print(json.dumps({
            "page":p["page"],
            "status":p["status"],
            "http_status":p.get("http_status"),
            "script_count":p["script_count"],
        },ensure_ascii=False))

    return 0 if accessible else 2

if __name__=="__main__":
    sys.exit(main())
