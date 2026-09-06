#!/usr/bin/env python3
import json,re,time,urllib.parse,urllib.request,urllib.robotparser
from pathlib import Path
BASE='https://www.marocimmo.com'
ROOT=BASE+'/fr/vente/appartement'
UA='AkarFinder-Audit/1.0 (+https://akarfinder.vercel.app; read-only public-results sweep)'
OUT=Path('artifacts/marocimmo-apartment-sale-sweep'); OUT.mkdir(parents=True,exist_ok=True)
MAX_PAGES=400; DELAY=0.45; TIMEOUT=20

def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/html,*/*;q=0.8'})
    with urllib.request.urlopen(req,timeout=TIMEOUT) as r:
        return r.status,r.read().decode('utf-8','replace')

rp=urllib.robotparser.RobotFileParser(); rp.set_url(BASE+'/robots.txt'); rp.read()
if not rp.can_fetch(UA,ROOT): raise SystemExit('robots disallows root')

all_urls=set(); pages=[]; errors=[]; consecutive_zero=0
for page in range(1,MAX_PAGES+1):
    url=ROOT if page==1 else ROOT+f'?page={page}'
    if not rp.can_fetch(UA,url):
        errors.append({'page':page,'url':url,'error':'robots_disallow'}); break
    try:
        st,html=get(url)
        hrefs=re.findall(r'href=["\']([^"\']+)["\']',html,re.I)
        page_urls=set()
        for h in hrefs:
            u=urllib.parse.urljoin(url,h).split('#')[0]
            p=urllib.parse.urlparse(u)
            if p.netloc not in ('www.marocimmo.com','marocimmo.com'): continue
            path=p.path.rstrip('/')
            # Detail pages under /fr/vente/<type>/<city>/<district?>/<descriptive-slug>
            if not path.startswith('/fr/vente/'): continue
            seg=[s for s in path.split('/') if s]
            if len(seg) < 6: continue
            last=seg[-1].lower()
            if last in {'appartement','villa','maison','terrain','bureau','local-commercial','casablanca','marrakech','rabat','tanger','agadir','fes','essaouira'}: continue
            if len(last) < 18: continue
            page_urls.add('https://www.marocimmo.com'+path)
        new=page_urls-all_urls
        all_urls |= page_urls
        pages.append({'page':page,'status':st,'found':len(page_urls),'new':len(new),'total_unique':len(all_urls)})
        print(json.dumps(pages[-1]),flush=True)
        if page>2 and not new:
            consecutive_zero += 1
        else:
            consecutive_zero = 0
        if consecutive_zero>=3: break
    except Exception as e:
        errors.append({'page':page,'url':url,'error':repr(e)})
        consecutive_zero += 1
        if consecutive_zero>=3: break
    time.sleep(DELAY)
summary={'generated_at':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'source':'marocimmo.com','lane':'fr/vente/appartement','mode':'read_only_results_only','zero_db_writes':True,'direct_detail_fetches':0,'robots_root_allowed':rp.can_fetch(UA,ROOT),'pages_attempted':len(pages)+len(errors),'pages_ok':len(pages),'unique_detail_urls':len(all_urls),'errors':errors,'stopped_after_consecutive_zero':consecutive_zero>=3}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
(OUT/'detail_urls.txt').write_text('\n'.join(sorted(all_urls))+('\n' if all_urls else ''),encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
