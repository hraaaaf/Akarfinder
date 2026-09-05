#!/usr/bin/env python3
import json,re,urllib.request,urllib.robotparser,urllib.parse
from pathlib import Path
SITES=['https://akaar.fr','https://sarout.ma','https://www.marocimmo.com','https://domio.ma','https://www.marocannonces.com','https://sekna.ma','https://immodirect.ma','https://www.mannonce.com']
UA='AkarFinder-Audit/1.0 (+https://akarfinder.vercel.app; read-only public-surface audit)'
OUT=Path('public-surface-probe'); OUT.mkdir(exist_ok=True)

def get(url,timeout=12):
 r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/html,application/xml;q=0.9,*/*;q=0.8'}),timeout=timeout); return r.status,r.headers.get('Content-Type',''),r.read().decode('utf-8','replace')
rows=[]
for base in SITES:
 host=urllib.parse.urlparse(base).netloc; row={'base':base,'host':host,'robots_ok':False,'root_allowed':None,'root_status':None,'sitemap_urls':0,'sitemap_candidates':[],'errors':[]}
 rp=urllib.robotparser.RobotFileParser(); rp.set_url(base+'/robots.txt')
 try: rp.read(); row['robots_ok']=True; row['root_allowed']=rp.can_fetch(UA,base+'/')
 except Exception as e: row['errors'].append('robots:'+repr(e)); rows.append(row); continue
 if row['root_allowed']:
  try: row['root_status']=get(base+'/')[0]
  except Exception as e: row['errors'].append('root:'+repr(e))
 smaps=[]
 for u in [base+'/sitemap.xml',base+'/sitemap_index.xml']:
  if not rp.can_fetch(UA,u): continue
  try:
   st,ct,txt=get(u)
   if st==200 and ('xml' in ct.lower() or '<loc>' in txt):
    locs=[x.strip().replace('&amp;','&') for x in re.findall(r'<loc>\s*(.*?)\s*</loc>',txt,re.I|re.S)]
    smaps.append({'url':u,'locs':len(locs)})
    row['sitemap_urls']+=len(locs)
  except Exception as e: row['errors'].append('sitemap:'+u+':'+repr(e))
 row['sitemap_candidates']=smaps; rows.append(row)
(OUT/'summary.json').write_text(json.dumps({'sites':rows},indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'sites':rows},indent=2,ensure_ascii=False))
