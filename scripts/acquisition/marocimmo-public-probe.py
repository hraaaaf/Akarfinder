#!/usr/bin/env python3
import json,re,time,urllib.parse,urllib.request,urllib.robotparser
from pathlib import Path
from datetime import datetime,timezone

BASE='https://www.marocimmo.com'
UA='AkarFinder-Audit/1.0 (+https://akarfinder.vercel.app; read-only public-surface audit)'
OUT=Path('artifacts/marocimmo-public-probe'); OUT.mkdir(parents=True,exist_ok=True)
TARGETS=[BASE+'/fr/vente',BASE+'/fr/location']


def get(url,timeout=25):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/html,application/xml;q=0.9,*/*;q=0.8'})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return r.status,r.headers.get('Content-Type',''),r.read().decode('utf-8','replace')

summary={'generated_at':datetime.now(timezone.utc).isoformat(),'source':'marocimmo.com','mode':'read_only_public_surface_probe','zero_db_writes':True,'direct_detail_fetches':0,'robots_status':None,'robots_sitemaps':[],'targets':[],'errors':[]}
try:
    st,ct,robots_txt=get(BASE+'/robots.txt',15)
    summary['robots_status']=st
    summary['robots_sitemaps']=re.findall(r'^\s*Sitemap:\s*(\S+)',robots_txt,re.I|re.M)
except Exception as e:
    summary['errors'].append('robots:'+repr(e))
    print(json.dumps(summary,indent=2,ensure_ascii=False)); raise SystemExit(2)

rp=urllib.robotparser.RobotFileParser(); rp.parse(robots_txt.splitlines())
for url in TARGETS:
    allowed=rp.can_fetch(UA,url)
    row={'url':url,'allowed':allowed,'status':None,'content_type':None,'advertised_count':None,'links_total':0,'same_host_links':0,'detail_like_links':0,'max_page_observed':0,'error':None}
    if allowed:
        try:
            st,ct,html=get(url,25); row['status']=st; row['content_type']=ct
            nums=[int(x.replace(' ','').replace('\u202f','')) for x in re.findall(r'([0-9][0-9\s\u202f]{2,})\s+(?:résultats|annonces|biens)',html,re.I)]
            if nums: row['advertised_count']=max(nums)
            hrefs=re.findall(r'href=["\']([^"\']+)["\']',html,re.I); row['links_total']=len(hrefs)
            same=[]; detail=[]; pages=[]
            for href in hrefs:
                v=urllib.parse.urljoin(url,href).split('#')[0]
                p=urllib.parse.urlparse(v)
                if p.netloc in ('marocimmo.com','www.marocimmo.com'):
                    same.append(v)
                    if re.search(r'/(annonce|bien|property|propriete|vente|location)/[^/?#]+(?:[-_/][0-9]{3,}|/[0-9]{3,})',p.path,re.I): detail.append(v)
                    qs=urllib.parse.parse_qs(p.query)
                    for k in ('page','p'):
                        for x in qs.get(k,[]):
                            if str(x).isdigit(): pages.append(int(x))
            row['same_host_links']=len(set(same)); row['detail_like_links']=len(set(detail)); row['max_page_observed']=max(pages) if pages else 0
        except Exception as e: row['error']=repr(e)
    summary['targets'].append(row); time.sleep(.2)

(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
if summary['robots_status']!=200: raise SystemExit(2)
