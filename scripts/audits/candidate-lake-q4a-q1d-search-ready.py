#!/usr/bin/env python3
import hashlib,json,os
from collections import Counter
from pathlib import Path

Q1D=Path(os.getenv('Q4A_Q1D_ROOT','.tmp/q4a-input/q1d'))
PUBLIC=Path(os.getenv('Q4A_PUBLIC_ROOT','.tmp/q4a-input/public'))
OUT=Path(os.getenv('Q4A_Q1D_OUT','.tmp/q4a-q1d-search-ready'))
EXPECTED=251_046

def load_jsonl(p):
    with open(p,encoding='utf-8') as f:
        for line in f:
            if line.strip(): yield json.loads(line)

def rich(f):
    return bool(f.get('city') and isinstance(f.get('price_mad'),(int,float)) and f['price_mad']>0 and isinstance(f.get('surface_m2'),(int,float)) and f['surface_m2']>0)

# Exact public identity_key -> exact source URL. Any conflicting URL for one key becomes unusable.
pub_url={}
conflicts=set()
for r in load_jsonl(PUBLIC/'public-dataset-features.jsonl'):
    k=r['identity_key']; u=r.get('url')
    if not u: continue
    if k in pub_url and pub_url[k]!=u:
        conflicts.add(k)
    else:
        pub_url[k]=u
for k in conflicts: pub_url.pop(k,None)

rows=[]; counts=Counter(); by_domain=Counter(); unresolved=Counter(); h=hashlib.sha256()
for idx,r in enumerate(load_jsonl(Q1D/'manifest-q1d.jsonl')):
    counts['input']+=1
    f=r['features']
    if not rich(f): continue
    counts['rich_city_price_surface']+=1
    key=r['representation_key']
    domain=r.get('normalized_source_domain') or r.get('source_domain') or key.split('|',1)[0]
    url=None; basis=None
    if '|url:' in key:
        url=key.split('|url:',1)[1]; basis='q1d_exact_url'
    elif key in pub_url:
        url=pub_url[key]; basis='public_dataset_exact_identity_url'
    if not url:
        unresolved[domain]+=1
        continue
    out={
        'row_index':idx,
        'representation_key':key,
        'source_domain':domain,
        'url':url,
        'city':f['city'],
        'district':f.get('district'),
        'price_mad':f['price_mad'],
        'surface_m2':f['surface_m2'],
        'property_type':f.get('property_type'),
        'transaction_type':f.get('transaction_type'),
        'title':f.get('title'),
        'url_resolution_basis':basis,
        'search_ready':True,
        'search_ready_rule':'url+city+price+surface'
    }
    rows.append(out); counts['search_ready']+=1; counts[basis]+=1; by_domain[domain]+=1
    if f.get('district'): counts['search_ready_with_district']+=1
    txt=json.dumps(out,separators=(',',':'),ensure_ascii=False)+'\n'; h.update(txt.encode())

assert counts['input']==EXPECTED
OUT.mkdir(parents=True,exist_ok=True)
with open(OUT/'search-ready-q1d.jsonl','w',encoding='utf-8') as f:
    for r in rows: f.write(json.dumps(r,separators=(',',':'),ensure_ascii=False)+'\n')
summary={
    'schemaVersion':'q4a-q1d-search-ready-v1',
    'rule':'url + city + price_mad>0 + surface_m2>0',
    'inputRepresentations':counts['input'],
    'richCityPriceSurface':counts['rich_city_price_surface'],
    'searchReady':counts['search_ready'],
    'searchReadyWithDistrict':counts['search_ready_with_district'],
    'urlResolutionBasis':{
        'q1d_exact_url':counts['q1d_exact_url'],
        'public_dataset_exact_identity_url':counts['public_dataset_exact_identity_url'],
    },
    'unresolvedRichByDomain':dict(sorted(unresolved.items())),
    'searchReadyByDomain':dict(sorted(by_domain.items())),
    'publicIdentityUrlConflictsExcluded':len(conflicts),
    'freshnessIsGate':False,
    'liveConfidenceIsGate':False,
    'clusteringIsGate':False,
    'missingUrlInvented':False,
    'databaseWrites':0,
    'productionWrites':0,
    'sourceSiteFetches':0,
    'vercelDeployments':0,
    'searchReadySha256':h.hexdigest(),
}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
