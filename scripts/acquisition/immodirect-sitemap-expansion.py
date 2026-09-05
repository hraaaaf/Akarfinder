#!/usr/bin/env python3
import json,re,urllib.request,urllib.robotparser,urllib.parse
from pathlib import Path
from datetime import datetime,timezone

BASE='https://immodirect.ma'
UA='AkarFinder-Audit/1.0 (+https://akarfinder.vercel.app; read-only public-surface audit)'
OUT=Path('artifacts/immodirect-sitemap-expansion'); OUT.mkdir(parents=True,exist_ok=True)
LOC_RE=re.compile(r'<loc>\s*(.*?)\s*</loc>',re.I|re.S)

def get(url,timeout=15):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'application/xml,text/xml,text/html;q=0.9,*/*;q=0.8'})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return r.status,r.headers.get('Content-Type',''),r.read().decode('utf-8','replace')

def norm(x): return x.strip().replace('&amp;','&')

rp=urllib.robotparser.RobotFileParser(); rp.set_url(BASE+'/robots.txt'); rp.read()
queue=[]
for u in [BASE+'/sitemap.xml',BASE+'/sitemap_index.xml']:
    if rp.can_fetch(UA,u): queue.append(u)
seen_xml=set(); urls=set(); docs=[]; errors=[]
while queue and len(seen_xml)<100:
    u=queue.pop(0)
    if u in seen_xml: continue
    seen_xml.add(u)
    if not rp.can_fetch(UA,u):
        errors.append({'url':u,'error':'robots_disallowed'}); continue
    try:
        st,ct,txt=get(u)
        locs=[norm(x) for x in LOC_RE.findall(txt)]
        docs.append({'url':u,'status':st,'content_type':ct,'locs':len(locs)})
        for loc in locs:
            p=urllib.parse.urlparse(loc)
            if p.netloc.lower() not in {'immodirect.ma','www.immodirect.ma'}: continue
            if loc.lower().endswith('.xml') or 'sitemap' in p.path.lower():
                if loc not in seen_xml and rp.can_fetch(UA,loc): queue.append(loc)
            else: urls.add(loc)
    except Exception as e: errors.append({'url':u,'error':repr(e)})

from collections import Counter
segments=Counter()
for u in urls:
    path=urllib.parse.urlparse(u).path.strip('/')
    segments[path.split('/')[0] if path else '/']+=1
listing=[]
for u in urls:
    p=urllib.parse.urlparse(u).path.lower()
    if any(k in p for k in ['/annonce','/bien','/property','/propriete','/vente/','/location/','/listing']): listing.append(u)
summary={
 'generated_at':datetime.now(timezone.utc).isoformat(),'source':'immodirect.ma','zero_db_writes':True,
 'robots_sitemap_allowed':bool(seen_xml),'xml_documents_visited':len(docs),'xml_documents':docs,
 'sitemap_public_urls':len(urls),'listing_hint_urls':len(set(listing)),
 'top_first_path_segments':segments.most_common(20),'errors':errors,'truncated':bool(queue)
}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
(OUT/'all_urls.txt').write_text('\n'.join(sorted(urls))+'\n')
(OUT/'listing_hint_urls.txt').write_text('\n'.join(sorted(set(listing)))+'\n')
print(json.dumps(summary,indent=2,ensure_ascii=False))
