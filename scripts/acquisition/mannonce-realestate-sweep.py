#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

BASE = "https://www.mannonce.com"
UA = "AkarFinder-public-sweep/1.0 (+https://akarfinder.vercel.app)"
OUT = Path("artifacts/mannonce-realestate-sweep")
OUT.mkdir(parents=True, exist_ok=True)
DETAIL_RE = re.compile(r"/[^/?#]+_(\d+)\.htm$", re.I)
CATEGORIES = [
    "Appartements_à_vendre",
    "Maisons_Villas_à_vendre",
    "Terrains_et_Fermes_à_vendre",
    "Magasins_et_commerces_à_vendre",
    "Offres_Location_vacances",
    "Autres_Immobilier_à_vendre",
]
ROOT = BASE + "/category/immobilier_à_vendre"
MAX_PAGES_PER_CATEGORY = 400
TIME_BUDGET_SECONDS = 600
SLEEP = 0.22

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]
    def handle_starttag(self, tag, attrs):
        if tag.lower()=="a":
            href=dict(attrs).get("href")
            if href: self.links.append(href)

def fetch(url: str) -> tuple[int,str,str]:
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"text/html,*/*;q=0.8"})
    with urllib.request.urlopen(req,timeout=20) as r:
        return int(getattr(r,"status",200)),r.geturl(),r.read().decode("utf-8","replace")

def main():
    rp=urllib.robotparser.RobotFileParser(); rp.set_url(BASE+"/robots.txt"); rp.read()
    started=time.monotonic(); records={}; category_stats=[]; errors=[]; pages_total=0; truncated=False

    for category in CATEGORIES:
        base=ROOT+"/"+urllib.parse.quote(category,safe="_à")
        cat_ids=set(); pages=0; empty_streak=0; last_page_ids=None
        for page in range(1,MAX_PAGES_PER_CATEGORY+1):
            if time.monotonic()-started >= TIME_BUDGET_SECONDS:
                truncated=True; break
            url=base if page==1 else base+"?page="+str(page)
            if not rp.can_fetch(UA,url):
                errors.append({"category":category,"page":page,"url":url,"error":"robots_disallowed"}); break
            try:
                status,final,html=fetch(url)
            except Exception as exc:
                errors.append({"category":category,"page":page,"url":url,"error":repr(exc)}); break
            pages+=1; pages_total+=1
            parser=Links(); parser.feed(html)
            page_ids=set()
            for href in parser.links:
                absolute=urllib.parse.urljoin(final,href)
                parsed=urllib.parse.urlsplit(absolute)
                if (parsed.hostname or "").lower()!="www.mannonce.com": continue
                m=DETAIL_RE.match(parsed.path)
                if not m: continue
                lid=m.group(1); page_ids.add(lid)
                records.setdefault(lid,{"id":lid,"url":urllib.parse.urlunsplit((parsed.scheme,parsed.netloc,parsed.path,"","")),"categories":[]})
                if category not in records[lid]["categories"]: records[lid]["categories"].append(category)
            new=page_ids-cat_ids; cat_ids.update(page_ids)
            if not page_ids or page_ids==last_page_ids or not new:
                empty_streak+=1
            else:
                empty_streak=0
            last_page_ids=page_ids
            if empty_streak>=2: break
            time.sleep(SLEEP)
        category_stats.append({"category":category,"pages_visited":pages,"unique_listing_ids":len(cat_ids),"stopped_by":"time_budget" if truncated else ("exhausted" if empty_streak>=2 else "page_cap")})
        if truncated: break

    summary={
        "generated_at":datetime.now(timezone.utc).isoformat(),"source":"mannonce.com public real-estate category HTML",
        "zero_db_writes":True,"robots_checked":True,"categories_expected":len(CATEGORIES),"categories_processed":len(category_stats),
        "pages_visited_total":pages_total,"unique_listing_ids":len(records),"category_stats":category_stats,
        "errors":errors,"elapsed_seconds":round(time.monotonic()-started,2),"truncated":truncated,"exhaustive_claim":not truncated and all(x["stopped_by"]=="exhausted" for x in category_stats)
    }
    (OUT/"summary.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False)+"\n")
    (OUT/"listing_ids.txt").write_text("\n".join(sorted(records,key=int))+("\n" if records else ""))
    (OUT/"records.jsonl").write_text("".join(json.dumps(records[k],ensure_ascii=False)+"\n" for k in sorted(records,key=int)))
    print(json.dumps(summary,indent=2,ensure_ascii=False))

if __name__=="__main__": main()
