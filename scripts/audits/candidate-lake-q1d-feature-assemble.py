#!/usr/bin/env python3
import hashlib, json, os, re, unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

Q1C_ROOT = Path(os.getenv('Q1D_Q1C_ROOT', '.tmp/q1d-input/q1c'))
DB_ROOT = Path(os.getenv('Q1D_DB_ROOT', '.tmp/q1d-input/db'))
OUT = Path(os.getenv('Q1D_OUT', '.tmp/q1d-features'))
EXPECTED_ROWS = 251_046
DATA49B_AGGREGATE_ONLY = 2_326

STOP = {'a','au','aux','avec','ce','ces','dans','de','des','du','en','et','la','le','les','pour','sur','un','une','vente','location','maroc'}
ID_RE = {
    'mubawab.ma': [re.compile(r'(?<!\d)(\d{5,})(?!\d)')],
    'avito.ma': [re.compile(r'(?<!\d)(\d{5,})(?!\d)')],
}

def load_jsonl(path):
    with open(path, encoding='utf-8') as f:
        for line in f:
            if line.strip():
                yield json.loads(line)

def norm_text(v):
    if v is None: return None
    s = unicodedata.normalize('NFKD', str(v)).encode('ascii','ignore').decode('ascii').lower()
    s = re.sub(r'[^a-z0-9]+', ' ', s).strip()
    return s or None

def tokens(v):
    s = norm_text(v)
    if not s: return []
    return sorted({t for t in s.split() if len(t) >= 2 and t not in STOP})

def canon_url(v):
    if not v: return None
    p = urlsplit(v.strip())
    host=(p.hostname or '').lower().removeprefix('www.')
    net=host+(f':{p.port}' if p.port else '')
    path=p.path.rstrip('/') or '/'
    return urlunsplit(((p.scheme or 'https').lower(),net,path,p.query,''))

def url_key(domain, url):
    c=canon_url(url)
    return f'{domain.lower().removeprefix("www.")}|url:{c}' if c else None

def extract_source_id(domain, url):
    if not url or domain not in ID_RE: return None
    path=urlsplit(url).path
    nums=[]
    for rg in ID_RE[domain]: nums.extend(rg.findall(path))
    if not nums: return None
    return nums[-1]

def fill(dst, key, value, source, sources):
    if value is None or value == '': return
    if dst.get(key) is None:
        dst[key]=value; sources[key]=source

def fp(parts):
    material='|'.join('' if x is None else str(x) for x in parts)
    return hashlib.sha256(material.encode()).hexdigest()[:24]

q1c=list(load_jsonl(Q1C_ROOT/'manifest-q1c.jsonl'))
assert len(q1c)==EXPECTED_ROWS
thin=list(load_jsonl(DB_ROOT/'thin-index-features.jsonl'))
listing_sources=list(load_jsonl(DB_ROOT/'listing-sources.jsonl'))
properties=list(load_jsonl(DB_ROOT/'property-listings.jsonl'))
prop_by_id={int(r['id']):r for r in properties}

# Exact/conservative URL maps. Ambiguous keys are deliberately excluded.
def unique_map(rows, key_fn):
    buckets=defaultdict(list)
    for r in rows:
        k=key_fn(r)
        if k: buckets[k].append(r)
    return {k:v[0] for k,v in buckets.items() if len(v)==1}, sum(1 for v in buckets.values() if len(v)>1)

thin_url, thin_url_amb = unique_map(thin, lambda r: url_key((r.get('source_domain') or '').lower().removeprefix('www.'), r.get('canonical_url')))
ls_enriched=[]
for ls in listing_sources:
    p=prop_by_id.get(int(ls['property_listing_id']))
    if not p: continue
    x={'ls':ls,'p':p}
    for u in (ls.get('listing_url'),ls.get('source_url')):
        if u:
            x2=dict(x); x2['match_url']=u; ls_enriched.append(x2)
ls_url, ls_url_amb = unique_map(ls_enriched, lambda x: url_key((urlsplit(x['match_url']).hostname or '').lower().removeprefix('www.'), x['match_url']))

# Source-ID maps derived only from already-stored DB URLs. Ambiguous IDs are excluded.
thin_id_b=defaultdict(list); ls_id_b=defaultdict(list)
for r in thin:
    d=(r.get('source_domain') or '').lower().removeprefix('www.'); sid=extract_source_id(d,r.get('canonical_url'))
    if sid: thin_id_b[f'{d}|id:{sid}'].append(r)
for x in ls_enriched:
    d=(urlsplit(x['match_url']).hostname or '').lower().removeprefix('www.'); sid=extract_source_id(d,x['match_url'])
    if sid: ls_id_b[f'{d}|id:{sid}'].append(x)
thin_id={k:v[0] for k,v in thin_id_b.items() if len(v)==1}; ls_id={k:v[0] for k,v in ls_id_b.items() if len(v)==1}

coverage=Counter(); match_basis=Counter(); richness=Counter(); by_domain=defaultdict(Counter)
out=[]
for base in q1c:
    d=base['normalized_source_domain']
    k=base['canonical_identity_key']
    t=None; lp=None; basis=None
    if base['identity_kind']=='url':
        uk=url_key(d,base['source_identity']); t=thin_url.get(uk); lp=ls_url.get(uk); basis='url_exact_canonical' if (t or lp) else None
    else:
        t=thin_id.get(k); lp=ls_id.get(k); basis='stored_url_source_id_exact' if (t or lp) else None
    f={
      'city':None,'district':None,'property_type':None,'transaction_type':None,
      'price_mad':None,'surface_m2':None,'rooms_count':None,'bedrooms_count':None,
      'bathrooms_count':None,'latitude':None,'longitude':None,'title':None,'address_text':None,
      'title_tokens':[],'address_tokens':[],'feature_evidence':{},'feature_match_basis':basis
    }
    src={}
    # Rich property_listings first because it has district/rooms and is tied through listing_sources.
    if lp:
        p=lp['p']
        fill(f,'city',p.get('city'),'property_listings',src); fill(f,'district',p.get('district'),'property_listings',src)
        fill(f,'property_type',p.get('property_type'),'property_listings',src); fill(f,'transaction_type',p.get('transaction_type'),'property_listings',src)
        fill(f,'price_mad',p.get('price_mad'),'property_listings',src); fill(f,'surface_m2',p.get('surface_m2'),'property_listings',src)
        fill(f,'rooms_count',p.get('rooms_count'),'property_listings',src); fill(f,'bedrooms_count',p.get('bedrooms_count'),'property_listings',src)
        fill(f,'bathrooms_count',p.get('bathrooms_count'),'property_listings',src); fill(f,'title',p.get('title'),'property_listings',src)
    if t:
        fill(f,'city',t.get('normalized_city'),'thin_index_search_documents',src); fill(f,'property_type',t.get('normalized_property_type'),'thin_index_search_documents',src)
        fill(f,'transaction_type',t.get('normalized_intent'),'thin_index_search_documents',src); fill(f,'price_mad',t.get('normalized_price_mad'),'thin_index_search_documents',src)
        fill(f,'surface_m2',t.get('normalized_surface_m2'),'thin_index_search_documents',src); fill(f,'title',t.get('title'),'thin_index_search_documents',src)
    f['feature_evidence']=src
    f['city']=norm_text(f['city']); f['district']=norm_text(f['district']); f['property_type']=norm_text(f['property_type']); f['transaction_type']=norm_text(f['transaction_type'])
    f['title_tokens']=tokens(f['title']); f['address_tokens']=tokens(f['address_text'])
    fields=['city','district','property_type','transaction_type','price_mad','surface_m2','rooms_count','bedrooms_count','bathrooms_count','latitude','longitude','title']
    present=sum(1 for x in fields if f[x] is not None)
    f['feature_count']=present
    f['fingerprint_v1']=fp([f['city'],f['district'],f['property_type'],f['transaction_type'],f['price_mad'],f['surface_m2'],f['bedrooms_count'],','.join(f['title_tokens'][:12])]) if present else None
    f['fingerprint_basis']='normalized_structured_features_v1' if f['fingerprint_v1'] else None
    row=dict(base); row['features']=f; out.append(row)
    match_basis[basis or 'unmatched']+=1
    richness[str(present)]+=1; by_domain[d]['rows']+=1; by_domain[d]['matched']+=1 if basis else 0
    for field in fields:
        if f[field] is not None:
            coverage[field]+=1; by_domain[d][field]+=1

text=''.join(json.dumps(r,separators=(',',':'),ensure_ascii=False)+'\n' for r in out)
OUT.mkdir(parents=True,exist_ok=True); (OUT/'manifest-q1d.jsonl').write_text(text,encoding='utf-8')
summary={
 'schemaVersion':'q1d-normalized-features-fingerprints-v1','inputRows':len(q1c),'outputRows':len(out),
 'matchedRows':len(out)-match_basis['unmatched'],'unmatchedRows':match_basis['unmatched'],'matchBasisCounts':dict(match_basis),
 'coverageCounts':dict(coverage),'richnessCounts':dict(sorted(richness.items(),key=lambda kv:int(kv[0]))),
 'domains':len(by_domain),'thinUrlAmbiguousKeysExcluded':thin_url_amb,'listingSourceUrlAmbiguousKeysExcluded':ls_url_amb,
 'fingerprintRows':sum(1 for r in out if r['features']['fingerprint_v1']),
 'data49bAggregateOnly':DATA49B_AGGREGATE_ONLY,'data49bIncluded':False,'missingDataInvented':False,
 'freshnessInferred':False,'authorizationInferred':False,'physicalPropertyMergePerformed':False,
 'databaseWrites':0,'productionWrites':0,'sourceSiteFetches':0,'vercelDeployments':0,
 'sha256':hashlib.sha256(text.encode()).hexdigest(),'failures':[]}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
with open(OUT/'coverage-by-domain.json','w',encoding='utf-8') as f: json.dump({k:dict(v) for k,v in sorted(by_domain.items())},f,indent=2,ensure_ascii=False)
print(json.dumps(summary,indent=2,ensure_ascii=False))
