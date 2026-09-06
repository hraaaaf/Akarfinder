#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

BASE = "https://yakeey.com"
UA = "AkarFinder-public-probe/1.0 (+https://akarfinder.vercel.app)"
OUT = Path("artifacts/yakeey-route-probe")
OUT.mkdir(parents=True, exist_ok=True)
SEEDS = [
    BASE + "/fr-ma/achat/biens/maroc",
    BASE + "/fr-ma/achat/biens/maroc?page=2",
    BASE + "/fr-ma/location/biens/maroc",
    BASE + "/fr-ma/location/biens/maroc?page=2",
]

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]
    def handle_starttag(self, tag, attrs):
        if tag.lower()=="a":
            href=dict(attrs).get("href")
            if href: self.links.append(href)

def fetch(url:str):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"text/html,*/*;q=0.8","Accept-Language":"fr-MA,fr;q=0.9"})
    with urllib.request.urlopen(req,timeout=25) as r:
        return int(getattr(r,"status",200)),r.geturl(),r.read().decode("utf-8","replace")

def main():
    rp=urllib.robotparser.RobotFileParser(); rp.set_url(BASE+"/robots.txt"); rp.read()
    rows=[]; all_paths=[]; errors=[]
    for seed in SEEDS:
        allowed=rp.can_fetch(UA,seed); row={"url":seed,"robots_allowed":allowed}
        if not allowed:
            rows.append(row); continue
        try:
            status,final,html=fetch(seed)
            p=Links(); p.feed(html); same=[]
            for href in p.links:
                absolute=urllib.parse.urljoin(final,href); parsed=urllib.parse.urlsplit(absolute)
                if (parsed.hostname or "").lower()!="yakeey.com": continue
                normalized=urllib.parse.urlunsplit((parsed.scheme,parsed.netloc,parsed.path,parsed.query,""))
                same.append(normalized); all_paths.append(parsed.path)
            row.update({"status":status,"final_url":final,"html_bytes":len(html.encode()),"same_host_links":len(set(same)),"sample_links":sorted(set(same))[:150]})
        except Exception as exc:
            errors.append({"url":seed,"error":repr(exc)}); row["error"]=repr(exc)
        rows.append(row); time.sleep(.35)
    shapes=Counter(re.sub(r"[0-9a-f]{8,}","{id}",re.sub(r"\d+","{n}",p),flags=re.I) for p in all_paths)
    first=Counter(p.strip('/').split('/')[0] if p.strip('/') else '/' for p in all_paths)
    summary={"generated_at":datetime.now(timezone.utc).isoformat(),"source":"yakeey.com public HTML","zero_db_writes":True,"robots_checked":True,"rows":rows,"top_first_segments":first.most_common(20),"top_path_shapes":shapes.most_common(80),"errors":errors}
    (OUT/"summary.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False)+"\n")
    print(json.dumps(summary,indent=2,ensure_ascii=False))

if __name__=="__main__": main()
