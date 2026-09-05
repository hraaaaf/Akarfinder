#!/usr/bin/env python3
import json,re,urllib.request,urllib.parse,time
from pathlib import Path
from datetime import datetime,timezone

UA='AkarFinder-public-index/1.0 (+https://akarfinder.vercel.app)'
OUT=Path('artifacts/marocannonces-commoncrawl-radar'); OUT.mkdir(parents=True,exist_ok=True)
ID_RE=re.compile(r'/annonce/(\d+)(?:/|$)',re.I)

def get_json(url,timeout=25):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'application/json'})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8','replace'))

def get_text(url,timeout=30):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'application/x-ndjson,text/plain,*/*'})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return r.read().decode('utf-8','replace')

collections=get_json('https://index.commoncrawl.org/collinfo.json')
latest=[x for x in collections if re.fullmatch(r'CC-MAIN-\d{4}-\d{2}',str(x.get('id','')))]
if not latest: raise SystemExit('no Common Crawl collection')
latest=latest[:4]
ids={}; errors=[]; requests=0; rows_seen=0
for coll in latest:
    cid=coll['id']; api=coll['cdx-api']
    params={'url':'marocannonces.com/*','output':'json','filter':'status:200','filter':'urlkey:.*annonce.*','collapse':'urlkey'}
    q=api+'?'+urllib.parse.urlencode(params)
    try:
        txt=get_text(q); requests+=1
        for line in txt.splitlines():
            line=line.strip()
            if not line: continue
            try: row=json.loads(line)
            except: continue
            rows_seen+=1
            u=str(row.get('url',''))
            m=ID_RE.search(urllib.parse.urlparse(u).path)
            if not m: continue
            idv=m.group(1)
            ids.setdefault(idv,{'id':idv,'url':u,'collections':[]})
            if cid not in ids[idv]['collections']: ids[idv]['collections'].append(cid)
    except Exception as e:
        errors.append({'collection':cid,'error':repr(e)})
    time.sleep(.4)

summary={
 'generated_at':datetime.now(timezone.utc).isoformat(),'source':'Common Crawl URL Index','target':'marocannonces.com',
 'collections':[x['id'] for x in latest],'requests':requests,'rows_seen':rows_seen,
 'unique_listing_ids':len(ids),'zero_db_writes':True,'direct_marocannonces_requests':0,
 'errors':errors,'exhaustive_claim':False
}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
(OUT/'listing_ids.txt').write_text('\n'.join(sorted(ids))+'\n')
(OUT/'records.jsonl').write_text(''.join(json.dumps(v,ensure_ascii=False)+'\n' for _,v in sorted(ids.items())))
print(json.dumps(summary,indent=2,ensure_ascii=False))
