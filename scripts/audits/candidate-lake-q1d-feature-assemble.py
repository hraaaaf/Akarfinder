#!/usr/bin/env python3
import hashlib, json, os, re, unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

Q1C_ROOT=Path(os.getenv('Q1D_Q1C_ROOT','.tmp/q1d-input/q1c'))
DB_ROOT=Path(os.getenv('Q1D_DB_ROOT','.tmp/q1d-input/db'))
PUBLIC_ROOT=Path(os.getenv('Q1D_PUBLIC_ROOT','.tmp/q1d-input/public'))
OUT=Path(os.getenv('Q1D_OUT','.tmp/q1d-features'))
EXPECTED_ROWS=251_046
DATA49B_AGGREGATE_ONLY=2_326
STOP={'a','au','aux','avec','ce','ces','dans','de','des','du','en','et','la','le','les','pour','sur','un','une','vente','location','maroc'}
ID_RE={'mubawab.ma':[re.compile(r'(?<!\d)(\d{5,})(?!\d)')],'avito.ma':[re.compile(r'(?<!\d)(\d{5,})(?!\d)')]}


def load_jsonl(path):
 with open(path,encoding='utf-8') as f:
  for line in f:
   if line.strip():yield json.loads(line)

def norm_text(v):
 if v is None:return None
 s=unicodedata.normalize('NFKD',str(v)).encode('ascii','ignore').decode('ascii').lower()
 s=re.sub(r'[^a-z0-9]+',' ',s).strip()
 return s or None

def norm_transaction(v):
 s=norm_text(v)
 if not s:return None
 if s in {'sale','vente','vendre','a vendre','buy','achat'}:return 'buy'
 if s in {'rent','location','louer','a louer'}:return 'rent'
 if s in {'new','neuf'}:return 'new'
 return s

def tokens(v):
 s=norm_text(v)
 if not s:return []
 return sorted({t for t in s.split() if len(t)>=2 and t not in STOP})

def canon_url(v):
 if not v:return None
 p=urlsplit(v.strip()); host=(p.hostname or '').lower().removeprefix('www.'); net=host+(f':{p.port}' if p.port else ''); path=p.path.rstrip('/') or '/'
 return urlunsplit(((p.scheme or 'https').lower(),net,path,p.query,''))

def url_key(domain,url):
 c=canon_url(url)
 return f'{domain.lower().removeprefix("www.")}|url:{c}' if c else None

def extract_source_id(domain,url):
 if not url or domain not in ID_RE:return None
 vals=[]
 for rg in ID_RE[domain]:vals.extend(rg.findall(urlsplit(url).path))
 return vals[-1] if vals else None

def numeric(v,positive=False):
 if v is None:return None
 try:x=float(v)
 except:return None
 if positive and x<=0:return None
 return x

def integer(v):
 x=numeric(v)
 return None if x is None else int(round(x))

def fill(dst,key,value,source,sources):
 if value is None or value=='':return
 if dst.get(key) is None:
  dst[key]=value; sources[key]=source

def fp(label,parts):
 material=label+'|'+'|'.join('' if x is None else str(x) for x in parts)
 return hashlib.sha256(material.encode()).hexdigest()[:24]

q1c=list(load_jsonl(Q1C_ROOT/'manifest-q1c.jsonl')); assert len(q1c)==EXPECTED_ROWS
thin=list(load_jsonl(DB_ROOT/'thin-index-features.jsonl'))
listing_sources=list(load_jsonl(DB_ROOT/'listing-sources.jsonl'))
properties=list(load_jsonl(DB_ROOT/'property-listings.jsonl'))
public=list(load_jsonl(PUBLIC_ROOT/'public-dataset-features.jsonl'))
prop_by_id={int(r['id']):r for r in properties}
public_by_id={r['identity_key']:r for r in public}
assert len(public_by_id)==len(public),'public dataset identity keys must already be unique'

# Thin-index keys: only one stored document per exact canonical URL/ID is accepted.
def strict_unique_map(rows,key_fn):
 b=defaultdict(list)
 for r in rows:
  k=key_fn(r)
  if k:b[k].append(r)
 return {k:v[0] for k,v in b.items() if len(v)==1},sum(1 for v in b.values() if len(v)>1)
thin_url,thin_url_amb=strict_unique_map(thin,lambda r:url_key((r.get('source_domain') or '').lower().removeprefix('www.'),r.get('canonical_url')))
thin_id_b=defaultdict(list)
for r in thin:
 d=(r.get('source_domain') or '').lower().removeprefix('www.'); sid=extract_source_id(d,r.get('canonical_url'))
 if sid:thin_id_b[f'{d}|id:{sid}'].append(r)
thin_id={k:v[0] for k,v in thin_id_b.items() if len(v)==1}; thin_id_amb=sum(1 for v in thin_id_b.values() if len(v)>1)

# listing_sources often repeats the same property via listing_url + source_url. A key is
# ambiguous only when it resolves to multiple DISTINCT property_listing_id values.
ls_url_b=defaultdict(list); ls_id_b=defaultdict(list)
for ls in listing_sources:
 p=prop_by_id.get(int(ls['property_listing_id']))
 if not p:continue
 for u in (ls.get('listing_url'),ls.get('source_url')):
  if not u:continue
  x={'ls':ls,'p':p,'match_url':u}; d=(urlsplit(u).hostname or '').lower().removeprefix('www.'); uk=url_key(d,u)
  if uk:ls_url_b[uk].append(x)
  sid=extract_source_id(d,u)
  if sid:ls_id_b[f'{d}|id:{sid}'].append(x)
def property_unique_map(b):
 out={}; amb=0
 for k,v in b.items():
  pids={int(x['ls']['property_listing_id']) for x in v}
  if len(pids)==1:out[k]=sorted(v,key=lambda x:(int(x['ls']['id']),x['match_url']))[0]
  else:amb+=1
 return out,amb
ls_url,ls_url_amb=property_unique_map(ls_url_b); ls_id,ls_id_amb=property_unique_map(ls_id_b)

coverage=Counter(); match_basis=Counter(); richness=Counter(); by_domain=defaultdict(Counter); fp_counts=Counter(); evidence_sources=Counter()
out=[]
for base in q1c:
 d=base['normalized_source_domain']; k=base['canonical_identity_key']; t=lp=pd=None; bases=[]
 if base['identity_kind']=='url':
  uk=url_key(d,base['source_identity']); t=thin_url.get(uk); lp=ls_url.get(uk)
  sid=extract_source_id(d,base['source_identity']); pd=public_by_id.get(f'{d}|id:{sid}') if sid else None
  if t or lp:bases.append('url_exact_canonical_db')
  if pd:bases.append('source_id_embedded_in_frozen_url_public_dataset')
 else:
  t=thin_id.get(k); lp=ls_id.get(k); pd=public_by_id.get(k)
  if t or lp:bases.append('stored_url_source_id_exact_db')
  if pd:bases.append('source_id_exact_public_dataset')
 f={'city':None,'district':None,'property_type':None,'transaction_type':None,'price_mad':None,'surface_m2':None,
    'rooms_count':None,'bedrooms_count':None,'bathrooms_count':None,'latitude':None,'longitude':None,'title':None,'address_text':None,
    'title_tokens':[],'address_tokens':[],'feature_evidence':{},'feature_match_basis':bases}
 src={}
 if lp:
  p=lp['p']
  for field,col in [('city','city'),('district','district'),('property_type','property_type'),('transaction_type','transaction_type'),('price_mad','price_mad'),('surface_m2','surface_m2'),('rooms_count','rooms_count'),('bedrooms_count','bedrooms_count'),('bathrooms_count','bathrooms_count'),('title','title')]:
   fill(f,field,p.get(col),'property_listings',src)
 if t:
  for field,col in [('city','normalized_city'),('property_type','normalized_property_type'),('transaction_type','normalized_intent'),('price_mad','normalized_price_mad'),('surface_m2','normalized_surface_m2'),('title','title')]:
   fill(f,field,t.get(col),'thin_index_search_documents',src)
 if pd:
  ds='public_dataset:'+pd['dataset']
  for field in ['city','district','property_type','transaction_type','price_mad','surface_m2','rooms_count','bedrooms_count','bathrooms_count','latitude','longitude','title','address_text']:
   fill(f,field,pd.get(field),ds,src)
 f['city']=norm_text(f['city']); f['district']=norm_text(f['district']); f['property_type']=norm_text(f['property_type']); f['transaction_type']=norm_transaction(f['transaction_type'])
 f['price_mad']=numeric(f['price_mad'],positive=True); f['surface_m2']=numeric(f['surface_m2'],positive=True)
 for n in ['rooms_count','bedrooms_count','bathrooms_count']: f[n]=integer(f[n])
 f['latitude']=numeric(f['latitude']); f['longitude']=numeric(f['longitude']); f['title_tokens']=tokens(f['title'])
 # Address tokens are evidence-preserving: explicit address_text plus district/city, never URL inference.
 f['address_tokens']=tokens(' '.join(x for x in [f.get('address_text'),f.get('district'),f.get('city')] if x))
 f['feature_evidence']=src
 for s in set(src.values()):evidence_sources[s]+=1
 fields=['city','district','property_type','transaction_type','price_mad','surface_m2','rooms_count','bedrooms_count','bathrooms_count','latitude','longitude','title']
 present=sum(f[x] is not None for x in fields); f['feature_count']=present
 f['fingerprints']={
  'location_type_v1':fp('location_type_v1',[f['city'],f['district'],f['property_type'],f['transaction_type']]) if f['city'] and f['property_type'] else None,
  'numeric_v1':fp('numeric_v1',[f['city'],f['price_mad'],f['surface_m2']]) if f['city'] and f['price_mad'] and f['surface_m2'] else None,
  'title_v1':fp('title_v1',[f['city'],','.join(f['title_tokens'][:16])]) if f['city'] and len(f['title_tokens'])>=3 else None,
  'geo_v1':fp('geo_v1',[round(f['latitude'],5),round(f['longitude'],5)]) if f['latitude'] is not None and f['longitude'] is not None else None,
 }
 viable=(f['city'] is not None and present>=3)
 f['fingerprint_v1']=fp('core_v1',[f['city'],f['district'],f['property_type'],f['transaction_type'],f['price_mad'],f['surface_m2'],f['bedrooms_count'],','.join(f['title_tokens'][:12])]) if viable else None
 f['fingerprint_basis']='normalized_structured_features_v1' if f['fingerprint_v1'] else None
 row=dict(base); row['features']=f; out.append(row)
 basis_label='+'.join(bases) if bases else 'unmatched'; match_basis[basis_label]+=1; richness[str(present)]+=1
 by_domain[d]['rows']+=1; by_domain[d]['matched']+=1 if bases else 0; by_domain[d]['fingerprint']+=1 if f['fingerprint_v1'] else 0
 for field in fields:
  if f[field] is not None:coverage[field]+=1; by_domain[d][field]+=1
 for name,val in f['fingerprints'].items():
  if val:fp_counts[name]+=1

text=''.join(json.dumps(r,separators=(',',':'),ensure_ascii=False)+'\n' for r in out)
OUT.mkdir(parents=True,exist_ok=True); (OUT/'manifest-q1d.jsonl').write_text(text,encoding='utf-8')
matched=sum(v for k,v in match_basis.items() if k!='unmatched')
summary={'schemaVersion':'q1d-normalized-features-fingerprints-v2','inputRows':len(q1c),'outputRows':len(out),'matchedRows':matched,'unmatchedRows':match_basis['unmatched'],
 'matchBasisCounts':dict(match_basis),'coverageCounts':dict(coverage),'richnessCounts':dict(sorted(richness.items(),key=lambda kv:int(kv[0]))),'fingerprintTypeCounts':dict(fp_counts),
 'fingerprintRows':sum(1 for r in out if r['features']['fingerprint_v1']),'evidenceSourceRowCounts':dict(evidence_sources),'domains':len(by_domain),
 'thinUrlAmbiguousKeysExcluded':thin_url_amb,'thinIdAmbiguousKeysExcluded':thin_id_amb,'listingSourceUrlAmbiguousKeysExcluded':ls_url_amb,'listingSourceIdAmbiguousKeysExcluded':ls_id_amb,
 'publicDatasetFeatureRows':len(public),'data49bAggregateOnly':DATA49B_AGGREGATE_ONLY,'data49bIncluded':False,'missingDataInvented':False,'freshnessInferred':False,'authorizationInferred':False,
 'physicalPropertyMergePerformed':False,'databaseWrites':0,'productionWrites':0,'sourceSiteFetches':0,'vercelDeployments':0,'sha256':hashlib.sha256(text.encode()).hexdigest(),'failures':[]}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
with open(OUT/'coverage-by-domain.json','w',encoding='utf-8') as f:json.dump({k:dict(v) for k,v in sorted(by_domain.items())},f,indent=2,ensure_ascii=False)
print(json.dumps(summary,indent=2,ensure_ascii=False))
