#!/usr/bin/env python3
import json,os,hashlib
from pathlib import Path
Q1D=Path(os.getenv('Q4A_Q1D_ROOT','.tmp/q4a-combined/q1d'))
PUBLIC=Path(os.getenv('Q4A_PUBLIC_ROOT','.tmp/q4a-combined/public'))
DBREC=Path(os.getenv('Q4A_DBREC_ROOT','.tmp/q4a-combined/dbrec'))
REPAIR=Path(os.getenv('Q4A_REPAIR_ROOT','.tmp/q4a-combined/repair'))
DBFIELD=Path(os.getenv('Q4A_DBFIELD_ROOT','.tmp/q4a-combined/dbfield'))
AVITO=Path(os.getenv('Q4A_AVITO_PUBLIC_ROOT','.tmp/q4a-combined/avito'))
OUT=Path(os.getenv('Q4A_COMBINED_OUT','.tmp/q4a-combined-out'))
EXPECTED=251_046

def jl(p):
 with open(p,encoding='utf-8') as f:
  for line in f:
   if line.strip(): yield json.loads(line)

def good(v): return isinstance(v,(int,float)) and v>0
public={r['identity_key']:r['url'] for r in jl(PUBLIC/'public-dataset-features.jsonl') if r.get('url')}
rec={r['representation_key']:r['url'] for r in jl(DBREC/'recovered-search-ready.jsonl')}
repair={r['row_index']:r for r in jl(REPAIR/'new-search-ready.jsonl')}
db={r['url'].strip().lower():r for r in jl(DBFIELD/'db-url-field-evidence.jsonl')}
avito={r['row_index']:r for r in jl(AVITO/'exact-crossmatches.jsonl')}

OUT.mkdir(parents=True,exist_ok=True)
h=hashlib.sha256();ready=0;dbadd=0;dbadd_by={};avadd=0;avadd_by={};missing={}
with open(OUT/'search-ready-combined.jsonl','w',encoding='utf-8') as o:
 for i,r in enumerate(jl(Q1D/'manifest-q1d.jsonl')):
  f=r['features'];key=r['representation_key'];sid=r['source_identity'];dom=r['normalized_source_domain']
  url=sid if r['identity_kind']=='url' and isinstance(sid,str) and sid.startswith(('http://','https://')) else public.get(key) or rec.get(key)
  c,p,s=f.get('city'),f.get('price_mad'),f.get('surface_m2')
  if i in repair:
   rr=repair[i];url,c,p,s=rr['url'],rr['city'],rr['price_mad'],rr['surface_m2']
  before_db=bool(url and c and good(p) and good(s))
  d=db.get(url.strip().lower()) if url else None
  if d:
   c=c or d.get('city'); p=p if good(p) else d.get('price_mad'); s=s if good(s) else d.get('surface_m2')
  after_db=bool(url and c and good(p) and good(s))
  if after_db and not before_db and d:
   dbadd+=1;dbadd_by[dom]=dbadd_by.get(dom,0)+1

  a=avito.get(i)
  if a:
   c=c or a.get('public_city')
   p=p if good(p) else a.get('public_price_mad')
   s=s if good(s) else a.get('public_surface_m2')
  now=bool(url and c and good(p) and good(s))
  if now and not after_db and a:
   avadd+=1;avadd_by[dom]=avadd_by.get(dom,0)+1

  if now:
   ready+=1
   row={'row_index':i,'representation_key':key,'source_domain':dom,'url':url,'city':c,'price_mad':p,'surface_m2':s,'search_ready':True}
   txt=json.dumps(row,separators=(',',':'),ensure_ascii=False)+'\n';o.write(txt);h.update(txt.encode())
  else:
   miss=[]
   if not url:miss.append('url')
   if not c:miss.append('city')
   if not good(p):miss.append('price')
   if not good(s):miss.append('surface')
   k='+'.join(miss);missing[k]=missing.get(k,0)+1
assert i+1==EXPECTED
summary={'schemaVersion':'q4a-combined-search-ready-v2-avito-public','inputRepresentations':EXPECTED,'searchReady':ready,'strictDbNetNew':dbadd,'strictDbNetNewByDomain':dbadd_by,'avitoPublicNetNew':avadd,'avitoPublicNetNewByDomain':avadd_by,'remainingMissingPatterns':dict(sorted(missing.items(),key=lambda kv:(-kv[1],kv[0]))),'rule':'url + city + price_mad>0 + surface_m2>0','freshnessIsGate':False,'liveConfidenceIsGate':False,'clusteringIsGate':False,'databaseWrites':0,'productionWrites':0,'sourceSiteFetches':0,'publicGitHubDatasetEvidence':True,'vercelDeployments':0,'sha256':h.hexdigest()}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');print(json.dumps(summary,indent=2,ensure_ascii=False))
