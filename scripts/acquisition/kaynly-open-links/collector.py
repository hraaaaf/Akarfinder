#!/usr/bin/env python3
"""Robots-aware, bounded public landing link discovery. No restricted endpoints."""
import argparse,json,re,time,urllib.error,urllib.parse,urllib.request,urllib.robotparser,xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
SITE="https://kaynly.com"
UA="AkarFinder-public-links-audit/0.1"
ROBOT=SITE+"/robots.txt"
SITEMAP=SITE+"/landings/sitemap.xml"
PORTALS={"mubawab.ma":"mubawab","avito.ma":"avito","sarouty.ma":"sarouty","yakeey.com":"yakeey","nouraimmobilier.ma":"noura"}

def original(url):
    try:
        p=urllib.parse.urlsplit(url); h=(p.hostname or "").lower()
        platform=next((name for d,name in PORTALS.items() if h in (d,"www."+d)),None)
        if p.scheme!="https" or not platform or p.username or p.password or p.port not in (None,443):return None
        x=urllib.parse.unquote(p.path)
        if "\\" in x or ".." in x.split("/") or "//" in x:return None
        m=None
        if platform=="mubawab":m=re.match(r"^/fr/(?:a|pa)/(\d{4,15})(?:/|$)",x)
        elif platform=="avito" and x.startswith("/fr/"):m=re.search(r"[_-](\d{7,11})\.htm$",x)
        elif platform=="sarouty" and x.startswith(("/acheter/","/louer/")):m=re.search(r"-(\d{4,12})\.html$",x)
        elif platform=="yakeey" and x.startswith("/fr-ma/"):m=re.search(r"-([a-z]{2}\d{5,12})$",x)
        elif platform=="noura":m=re.match(r"^/property/([a-z0-9-]+)/?$",x,re.I)
        if not m:return None
        key=platform+":"+m.group(1).lower()
        return {"id":key,"platform":platform,"url":urllib.parse.urlunsplit(("https",p.netloc.lower(),p.path.rstrip("/"),"","")),"detail_state":"not_fetched"}
    except (ValueError,TypeError):return None

class Anchors(HTMLParser):
    def __init__(self):super().__init__();self.hrefs=[]
    def handle_starttag(self,tag,attrs):
        if tag.lower()=="a":
            href=dict(attrs).get("href")
            if href:self.hrefs.append(href)

def extract(html,page):
    a=Anchors();a.feed(html);found={}
    for href in a.hrefs:
        rec=original(urllib.parse.urljoin(page,href))
        if rec:found[rec["id"]]=rec
    return list(found.values())

def parse_sitemap(data):
    urls=set()
    for node in ET.fromstring(data).iter():
        if node.tag.split("}")[-1]!="loc" or not node.text:continue
        u=node.text.strip();p=urllib.parse.urlsplit(u)
        if p.scheme=="https" and p.netloc=="kaynly.com" and not p.query and not p.fragment and re.fullmatch(r"/(vente|location)/[a-z0-9-]+(?:/[a-z0-9-]+)?",p.path):urls.add(u)
    return sorted(urls,key=lambda u:(u.count("/"),u))

def guard(text):
    directives={x.strip().lower().replace(" ","") for x in text.splitlines()}
    if not {"disallow:/api/","disallow:/resultats","sitemap:"+SITEMAP}.issubset(directives):
        raise ValueError("robots directives changed")
    r=urllib.robotparser.RobotFileParser();r.parse(text.splitlines())
    def allowed(url):
        p=urllib.parse.urlsplit(url)
        return p.scheme=="https" and p.netloc=="kaynly.com" and not p.path.startswith(("/api/","/resultats")) and r.can_fetch(UA,url)
    if not allowed(SITEMAP):raise ValueError("sitemap denied")
    return allowed

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,url):raise ValueError("redirect denied before follow")

def fetch(url,cap=2_000_000):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"text/html,application/xml,text/xml"})
    with urllib.request.build_opener(NoRedirect()).open(req,timeout=18) as r:
        data=r.read(cap+1)
        if len(data)>cap:raise ValueError("response too large")
        if (urllib.parse.urlsplit(r.geturl()).hostname or "")!="kaynly.com":raise ValueError("offsite redirect")
        return data

def collect(folder,max_pages=60,delay=1.3):
    if not 1<=max_pages<=120 or delay<1:raise ValueError("budget invalid")
    folder.mkdir(parents=True,exist_ok=True)
    result={"site":"kaynly.com","robots_aware":True,"historical_used_as_seed":False,
            "listing_pages_fetched":0,"photos_fetched":0,"commercial_reuse_rights_verified":False,
            "pages":[]}
    unique={};provenance=[];reason=None
    try:
        allowed=guard(fetch(ROBOT,65536).decode("utf-8",errors="replace"))
        pages=parse_sitemap(fetch(SITEMAP));result["landing_pages_in_sitemap"]=len(pages)
        for page in pages[:max_pages]:
            if not allowed(page):result["pages"].append({"url":page,"status":"robots_denied"});continue
            time.sleep(delay)
            try:
                records=extract(fetch(page).decode("utf-8",errors="replace"),page)
                for rec in records:
                    unique.setdefault(rec["id"],rec)
                    provenance.append({"source_page":page,"source_id":rec["id"],"source_url":rec["url"]})
                result["pages"].append({"url":page,"status":200,"links":len(records)})
            except urllib.error.HTTPError as exc:
                result["pages"].append({"url":page,"status":exc.code})
                if exc.code in (401,403,429):reason="access_refused";break
            except (OSError,ValueError) as exc:
                reason="fetch_error";result["pages"].append({"url":page,"error":str(exc)[:150]});break
        if reason is None and len(pages)>max_pages:reason="page_budget"
    except (OSError,ValueError,ET.ParseError) as exc:
        reason="preflight_failure";result["preflight_error"]=str(exc)[:150]
    for filename,items in [("source_links.jsonl",sorted(unique.values(),key=lambda x:x["id"])),("provenance.jsonl",provenance)]:
        with (folder/filename).open("w",encoding="utf-8") as stream:
            for rec in items:stream.write(json.dumps(rec,ensure_ascii=False)+"\n")
    result.update({"unique_source_ids":len(unique),"provenance_edges":len(provenance),
                   "pages_successful":sum(x.get("status")==200 for x in result["pages"]),
                   "stop_reason":reason})
    (folder/"report.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    return result

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--out",type=Path,required=True)
    p.add_argument("--max-pages",type=int,default=60);p.add_argument("--delay",type=float,default=1.3)
    a=p.parse_args();r=collect(a.out,a.max_pages,a.delay)
    print(json.dumps({k:v for k,v in r.items() if k!="pages"}))
    raise SystemExit(0 if r["unique_source_ids"]>0 and r["stop_reason"]!="preflight_failure" else 2)
