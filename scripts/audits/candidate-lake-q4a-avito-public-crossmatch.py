#!/usr/bin/env python3
import csv,json,os,re,hashlib
from pathlib import Path
Q1D=Path(os.getenv('Q4A_Q1D_ROOT','.tmp/q4a-avito-public/q1d'))
CSV=Path(os.getenv('Q4A_AVITO_PUBLIC_CSV','.tmp/q4a-avito-public/raw-fetched-data.csv'))
OUT=Path(os.getenv('Q4A_AVITO_PUBLIC_OUT','.tmp/q4a-avito-public-out'))
EXPECTED=251_046

def jl(p):
 with open(p,encoding='utf-8') as f:
  for line in f:
   if line.strip():yield json.loads(line)

def num(v):
 try:
  x=float(str(v).replace(' ','').replace(',','.'))
  return x if x>0 else None
 except:return None

avito={}
for i,r in enumerate(jl(Q1D/'manifest-q1d.jsonl')):
 if r.get('normalized_source_domain')!='avito.ma':continue
 k=r.get('representation_key','')
 m=re.search(r'\|id:(\d+)$',k)
 if m:avito.setdefault(m.group(1),[]).append((i,r))
assert i+1==EXPECTED

matches=[];ambiguous=[];seen={}
with open(CSV,encoding='utf-8-sig',newline='') as f:
 reader=csv.DictReader(f)
 headers=reader.fieldnames or []
 for rownum,row in enumerate(reader,2):
  ids=[]
  for col in ('adId','listId'):
   v=str(row.get(col,'')).strip()
   if v and v!='nan':ids.append((col,v))
  for col,v in ids:
   if v not in avito:continue
   price=num(row.get('price'))
   city=(row.get('locationCityName') or '').strip() or None
   # Surface param names vary; prefer exact common columns, then detect one surface-like numeric column.
   surf=None;surf_col=None
   for c in ('area','surface','surface_area','living_area','land_area'):
    if c in row and num(row.get(c)):
     surf=num(row.get(c));surf_col=c;break
   if surf is None:
    candidates=[]
    for c,val in row.items():
     lc=c.lower()
     if any(t in lc for t in ('surface','area')) and c not in ('locationAreaId','locationAreaName'):
      nv=num(val)
      if nv and 5<=nv<=200000:candidates.append((c,nv))
    vals={v for _,v in candidates}
    if len(vals)==1:
     surf=next(iter(vals));surf_col=next(c for c,vv in candidates if vv==surf)
   key=(v,col)
   rec={'matched_id':v,'matched_column':col,'csv_row':rownum,'price_mad':price,'city':city,'surface_m2':surf,'surface_column':surf_col}
   prev=seen.get(key)
   if prev and prev!=rec:ambiguous.append(key)
   else:seen[key]=rec

bad=set(ambiguous)
for (v,col),rec in seen.items():
 if (v,col) in bad:continue
 for idx,r in avito[v]:
  f=r['features']
  matches.append({'row_index':idx,'representation_key':r['representation_key'],'matched_id':v,'matched_column':col,'public_price_mad':rec['price_mad'],'public_city':rec['city'],'public_surface_m2':rec['surface_m2'],'surface_column':rec['surface_column']})

# Deduplicate a representation only when all matching public rows agree on the extracted fields.
by={}
for m in matches:by.setdefault(m['row_index'],[]).append(m)
out=[];rep_amb=0
for idx,ms in sorted(by.items()):
 vals={(m['public_price_mad'],m['public_city'],m['public_surface_m2']) for m in ms}
 if len(vals)!=1:rep_amb+=1;continue
 out.append(ms[0])
OUT.mkdir(parents=True,exist_ok=True)
body=''.join(json.dumps(r,separators=(',',':'),ensure_ascii=False)+'\n' for r in out)
(OUT/'exact-crossmatches.jsonl').write_text(body,encoding='utf-8')
h=hashlib.sha256(body.encode()).hexdigest()
summary={'schemaVersion':'q4a-avito-public-crossmatch-v1','datasetCommit':'0a5eeabc98aab88e4f4548c3ef19510d553f1433','datasetFile':'data/raw-fetched-data.csv','headers':headers,'candidateAvitoIds':len(avito),'exactMatchedRepresentations':len(out),'matchedWithPrice':sum(r['public_price_mad'] is not None for r in out),'matchedWithCity':sum(r['public_city'] is not None for r in out),'matchedWithSurface':sum(r['public_surface_m2'] is not None for r in out),'ambiguousRepresentationsExcluded':rep_amb,'sourceSiteFetches':0,'publicGitHubDatasetFetches':1,'databaseWrites':0,'productionWrites':0,'vercelDeployments':0,'sha256':h}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');print(json.dumps(summary,indent=2,ensure_ascii=False))
