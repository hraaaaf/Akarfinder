#!/usr/bin/env python3
import json,re,urllib.request,urllib.robotparser,urllib.parse,xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime,timezone

BASE='https://www.mannonce.com'
UA='AkarFinder-public-probe/1.0 (+https://akarfinder.vercel.app)'
OUT=Path('artifacts/mannonce-surface-probe'); OUT.mkdir(parents=True,exist_ok=True)


def fetch(url,timeout=20):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'*/*'})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return int(getattr(r,'status',200)), r.geturl(), r.headers.get('content-type',''), r.read()

summary={'generated_at':datetime.now(timezone.utc).isoformat(),'source':'mannonce.com','zero_db_writes':True,'robots_loaded':False,'root_allowed':False,'routes':{},'sitemaps':[],'listing_ids':[],'errors':[]}
try:
    status,_,_,body=fetch(BASE+'/robots.txt')
    text=body.decode('utf-8','replace')
    rp=urllib.robotparser.RobotFileParser(); rp.set_url(BASE+'/robots.txt'); rp.parse(text.splitlines()); summary['robots_loaded']=status==200
    summary['root_allowed']=rp.can_fetch(UA,BASE+'/')
    candidates=[BASE+'/sitemap.xml',BASE+'/sitemap_index.xml']
    for line in text.splitlines():
        m=re.match(r'(?i)^\s*sitemap\s*:\s*(\S+)',line)
        if m: candidates.append(m.group(1).strip())
    seen=set()
    for url in candidates:
        if url in seen: continue
        seen.add(url)
        try:
            if not rp.can_fetch(UA,url):
                summary['sitemaps'].append({'url':url,'allowed':False}); continue
            st,final,ct,b=fetch(url)
            locs=[]
            if st==200:
                try:
                    root=ET.fromstring(b)
                    locs=[e.text.strip() for e in root.iter() if e.tag.lower().endswith('loc') and e.text]
                except Exception: pass
            ids=[]
            for u in locs:
                m=re.search(r'_(\d+)\.htm(?:$|[?#])',u,re.I)
                if m: ids.append(m.group(1))
            summary['listing_ids'].extend(ids)
            summary['sitemaps'].append({'url':url,'allowed':True,'status':st,'final_url':final,'content_type':ct,'locs':len(locs),'listing_ids':len(set(ids))})
        except Exception as e: summary['errors'].append({'url':url,'error':repr(e)})
    routes=[
      BASE+'/category/immobilier_%C3%A0_vendre/Appartements',
      BASE+'/category/immobilier_%C3%A0_vendre/Maisons_et_Villas',
      BASE+'/category/immobilier_%C3%A0_vendre/Terrains_et_Fermes',
      BASE+'/search?page=1'
    ]
    for url in routes:
        allowed=rp.can_fetch(UA,url); item={'allowed':allowed}
        if allowed:
            try:
                st,final,ct,b=fetch(url); html=b.decode('utf-8','ignore')
                ids=sorted(set(re.findall(r'_(\d+)\.htm(?:[\"\'?#]|$)',html,re.I)))
                item.update({'status':st,'final_url':final,'content_type':ct,'listing_ids':len(ids),'sample_ids':ids[:10]})
                summary['listing_ids'].extend(ids)
            except Exception as e: item['error']=repr(e)
        summary['routes'][url]=item
except Exception as e:
    summary['errors'].append({'url':BASE+'/robots.txt','error':repr(e)})
summary['listing_ids']=sorted(set(summary['listing_ids']))
summary['unique_listing_ids']=len(summary['listing_ids'])
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
(OUT/'listing_ids.txt').write_text('\n'.join(summary['listing_ids'])+('\n' if summary['listing_ids'] else ''))
print(json.dumps(summary,indent=2,ensure_ascii=False))
