#!/usr/bin/env python3
import json,re,urllib.request,urllib.robotparser
from pathlib import Path
from datetime import datetime,timezone

BASE='https://yakeey.com'
UA='AkarFinder-public-probe/1.0 (+https://akarfinder.vercel.app)'
OUT=Path('artifacts/yakeey-public-probe'); OUT.mkdir(parents=True,exist_ok=True)
URLS=[
 BASE+'/fr-ma/achat/biens/maroc',
 BASE+'/fr-ma/achat/appartement/maroc',
 BASE+'/fr-ma/achat/biens/casablanca',
 BASE+'/fr-ma/achat/appartement/casablanca'
]

def fetch(url,timeout=20):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/html,*/*;q=0.8'})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return int(getattr(r,'status',200)),r.geturl(),r.read().decode('utf-8','ignore')

s={'generated_at':datetime.now(timezone.utc).isoformat(),'source':'yakeey.com','zero_db_writes':True,'robots_loaded':False,'routes':{},'errors':[]}
try:
    st,_,robots_text=fetch(BASE+'/robots.txt')
    rp=urllib.robotparser.RobotFileParser(); rp.set_url(BASE+'/robots.txt'); rp.parse(robots_text.splitlines()); s['robots_loaded']=st==200
    for u in URLS:
        allowed=rp.can_fetch(UA,u); item={'allowed':allowed}
        if allowed:
            try:
                status,final,html=fetch(u)
                counts=[int(x.replace(' ','')) for x in re.findall(r'([0-9][0-9 ]{1,8})\s+Biens immobiliers',html,re.I)]
                hrefs=sorted(set(re.findall(r'href=[\"\']([^\"\']+)[\"\']',html,re.I)))
                detail=[h for h in hrefs if re.search(r'/(?:bien|property|annonce|detail|listing)/',h,re.I)]
                pages=[int(x) for x in re.findall(r'[?&]page=(\d+)',html)]
                item.update({'status':status,'final_url':final,'advertised_counts':counts[:10],'max_page_observed':max(pages) if pages else None,'detail_like_links':len(detail),'sample_detail_links':detail[:10]})
            except Exception as e:item['error']=repr(e)
        s['routes'][u]=item
except Exception as e:s['errors'].append({'error':repr(e)})
(OUT/'summary.json').write_text(json.dumps(s,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(s,indent=2,ensure_ascii=False))
