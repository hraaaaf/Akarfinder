#!/usr/bin/env python3
import json,re,time,urllib.request,urllib.robotparser
from pathlib import Path
from datetime import datetime, timezone

BASE='https://domio.ma'
TARGET=BASE+'/sitemap-properties.xml'
UA='AkarFinder-Audit/1.0 (+https://akarfinder.vercel.app; read-only public-surface audit)'
OUT=Path('artifacts/domio-properties-sitemap-retry'); OUT.mkdir(parents=True,exist_ok=True)
TIMEOUT=60
ATTEMPTS=5

rp=urllib.robotparser.RobotFileParser(); rp.set_url(BASE+'/robots.txt'); rp.read()
allowed=rp.can_fetch(UA,TARGET)
summary={
  'generated_at':datetime.now(timezone.utc).isoformat(),
  'source':'domio.ma',
  'target':TARGET,
  'zero_db_writes':True,
  'robots_allowed':allowed,
  'attempts':0,
  'status':None,
  'content_type':None,
  'locs_total':0,
  'unique_property_urls':0,
  'property_urls':[],
  'errors':[],
  'success':False,
}
if not allowed:
  summary['errors'].append('robots_disallow')
else:
  for i in range(1,ATTEMPTS+1):
    summary['attempts']=i
    try:
      req=urllib.request.Request(TARGET,headers={'User-Agent':UA,'Accept':'application/xml,text/xml;q=0.9,*/*;q=0.8'})
      with urllib.request.urlopen(req,timeout=TIMEOUT) as r:
        body=r.read().decode('utf-8','replace')
        summary['status']=r.status
        summary['content_type']=r.headers.get('Content-Type','')
      locs=[x.strip().replace('&amp;','&') for x in re.findall(r'<loc>\s*(.*?)\s*</loc>',body,re.I|re.S)]
      props=sorted(set(u for u in locs if re.search(r'https?://(?:www\.)?domio\.ma/(?:fr/)?(?:propriete|property)/',u,re.I)))
      summary['locs_total']=len(locs)
      summary['property_urls']=props
      summary['unique_property_urls']=len(props)
      summary['success']=True
      break
    except Exception as e:
      summary['errors'].append({'attempt':i,'error':repr(e)})
      if i<ATTEMPTS: time.sleep(min(20,2**i))

(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
(OUT/'property_urls.txt').write_text('\n'.join(summary['property_urls']) + ('\n' if summary['property_urls'] else ''),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k!='property_urls'},indent=2,ensure_ascii=False))
if not allowed: raise SystemExit(3)
if not summary['success']: raise SystemExit(2)
