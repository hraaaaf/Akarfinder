#!/usr/bin/env python3
import json,re,time,urllib.parse,urllib.request,urllib.robotparser
from collections import deque,Counter
from pathlib import Path
BASE='https://www.marocimmo.com'
UA='AkarFinder-Audit/1.0 (+https://akarfinder.vercel.app; read-only public-surface audit)'
OUT=Path('artifacts/marocimmo-sitemap-enumeration'); OUT.mkdir(parents=True,exist_ok=True)
START=BASE+'/sitemap.xml'; TIMEOUT=30; MAX_XML=500

def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'application/xml,text/xml;q=0.9,*/*;q=0.8'})
    with urllib.request.urlopen(req,timeout=TIMEOUT) as r:
        return r.status,r.headers.get('Content-Type',''),r.read().decode('utf-8','replace')

rp=urllib.robotparser.RobotFileParser(); rp.set_url(BASE+'/robots.txt'); rp.read()
if not rp.can_fetch(UA,START): raise SystemExit('robots disallows sitemap.xml')
q=deque([START]); seen=set(); urls=set(); xml_rows=[]; errors=[]
while q and len(seen)<MAX_XML:
    u=q.popleft()
    if u in seen: continue
    seen.add(u)
    if not rp.can_fetch(UA,u): errors.append({'url':u,'error':'robots_disallow'}); continue
    try:
        st,ct,txt=get(u)
        locs=[x.strip().replace('&amp;','&') for x in re.findall(r'<loc>\s*(.*?)\s*</loc>',txt,re.I|re.S)]
        xml_rows.append({'url':u,'status':st,'content_type':ct,'locs':len(locs)})
        for loc in locs:
            p=urllib.parse.urlparse(loc)
            if p.netloc not in ('www.marocimmo.com','marocimmo.com'): continue
            if loc.lower().endswith('.xml'): q.append(loc)
            else: urls.add(loc.split('#')[0])
    except Exception as e:
        errors.append({'url':u,'error':repr(e)})
    time.sleep(.1)

patterns={
 'vente': re.compile(r'/fr/vente(?:/|$)',re.I),
 'location': re.compile(r'/fr/location(?:/|$)',re.I),
 'numeric_tail': re.compile(r'/\d+(?:[/?#]|$)'),
 'detail_words': re.compile(r'/(annonce|bien|property|propriete|appartement|villa|maison|terrain|bureau|commerce|riad|studio|duplex)(?:[-_/]|$)',re.I),
}
counts={k:sum(1 for u in urls if rx.search(urllib.parse.urlparse(u).path)) for k,rx in patterns.items()}
segments=Counter((urllib.parse.urlparse(u).path.strip('/').split('/')[0] if urllib.parse.urlparse(u).path.strip('/') else '/') for u in urls)
summary={
 'generated_at':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
 'source':'marocimmo.com','mode':'read_only_public_sitemap_enumeration','zero_db_writes':True,'direct_detail_fetches':0,
 'robots_sitemap_allowed':True,'xml_documents_visited':len(seen),'xml_documents':xml_rows,'public_urls_unique':len(urls),
 'pattern_counts':counts,'top_first_path_segments':segments.most_common(30),'errors':errors,'truncated':bool(q)
}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
(OUT/'urls.txt').write_text('\n'.join(sorted(urls))+('\n' if urls else ''),encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
if errors and not urls: raise SystemExit(2)
