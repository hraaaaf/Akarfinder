#!/usr/bin/env python3
import json,re,time,urllib.parse,urllib.request,urllib.robotparser
from collections import Counter,deque
from pathlib import Path

BASE='https://akaar.fr'
UA='AkarFinder-Audit/1.0 (+https://akarfinder.vercel.app; read-only public-surface audit)'
OUT=Path('artifacts/akaar-sitemap-expansion'); OUT.mkdir(parents=True,exist_ok=True)
MAX_XML=200
TIMEOUT=12


def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/html,application/xml;q=0.9,*/*;q=0.8'})
    with urllib.request.urlopen(req,timeout=TIMEOUT) as r:
        return r.status,r.headers.get('Content-Type',''),r.read().decode('utf-8','replace')

rp=urllib.robotparser.RobotFileParser(); rp.set_url(BASE+'/robots.txt'); rp.read()
if not rp.can_fetch(UA,BASE+'/sitemap.xml'):
    raise SystemExit('robots disallows sitemap.xml')

queue=deque([BASE+'/sitemap.xml'])
seen_xml=set(); public_urls=set(); errors=[]; xml_rows=[]
while queue and len(seen_xml)<MAX_XML:
    u=queue.popleft()
    if u in seen_xml: continue
    seen_xml.add(u)
    if not rp.can_fetch(UA,u):
        errors.append({'url':u,'error':'robots_disallow'}); continue
    try:
        st,ct,txt=get(u)
        locs=[x.strip().replace('&amp;','&') for x in re.findall(r'<loc>\s*(.*?)\s*</loc>',txt,re.I|re.S)]
        xml_rows.append({'url':u,'status':st,'content_type':ct,'locs':len(locs)})
        for loc in locs:
            p=urllib.parse.urlparse(loc)
            if p.netloc not in ('akaar.fr','www.akaar.fr'): continue
            if loc.lower().endswith('.xml'):
                queue.append(loc)
            else:
                public_urls.add(loc)
    except Exception as e:
        errors.append({'url':u,'error':repr(e)})
    time.sleep(0.15)

# Add high-value public surfaces even if the sitemap is sparse.
seed_pages=[BASE+'/',BASE+'/marketplace',BASE+'/partners',BASE+'/cities']
html_links=set()
for u in seed_pages:
    if not rp.can_fetch(UA,u): continue
    try:
        st,ct,txt=get(u)
        for href in re.findall(r'href=["\']([^"\']+)["\']',txt,re.I):
            v=urllib.parse.urljoin(u,href)
            p=urllib.parse.urlparse(v)
            if p.netloc in ('akaar.fr','www.akaar.fr'):
                html_links.add(v.split('#')[0])
    except Exception as e:
        errors.append({'url':u,'error':repr(e)})
    time.sleep(0.15)

all_urls=sorted(public_urls|html_links)
paths=[urllib.parse.urlparse(u).path for u in all_urls]
first_segments=Counter((p.strip('/').split('/')[0] if p.strip('/') else '/') for p in paths)
# Deliberately broad: noise is allowed in discovery. These are only candidate hints.
listing_hint_patterns=[r'/listing(?:s)?/',r'/property(?:ies)?/',r'/bien(?:s)?/',r'/annonce(?:s)?/',r'/marketplace/[^/?]+']
hinted=[u for u in all_urls if any(re.search(rx,urllib.parse.urlparse(u).path,re.I) for rx in listing_hint_patterns)]
summary={
    'generated_at':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
    'source':'akaar.fr',
    'zero_db_writes':True,
    'robots_sitemap_allowed':rp.can_fetch(UA,BASE+'/sitemap.xml'),
    'xml_documents_visited':len(seen_xml),
    'xml_documents':xml_rows,
    'sitemap_public_urls':len(public_urls),
    'html_same_host_links':len(html_links),
    'candidate_union_urls':len(all_urls),
    'listing_hint_urls':len(hinted),
    'top_first_path_segments':first_segments.most_common(30),
    'errors':errors,
    'truncated':bool(queue),
}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
(OUT/'candidate_urls.txt').write_text('\n'.join(all_urls)+'\n',encoding='utf-8')
(OUT/'listing_hint_urls.txt').write_text('\n'.join(sorted(hinted))+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
