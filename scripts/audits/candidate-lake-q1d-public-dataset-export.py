#!/usr/bin/env python3
import csv, hashlib, io, json, os, re, urllib.request
from collections import Counter
from pathlib import Path

OUT=Path(os.getenv('Q1D_PUBLIC_OUT','.tmp/q1d-public-features'))
OUT.mkdir(parents=True,exist_ok=True)

DATASETS=[
 {
  'name':'realestatebuddy_mubawab', 'source_domain':'mubawab.ma', 'transaction':None,
  'commit':'a890a7da899d84d879c702bec09b9d628671f758',
  'url':'https://raw.githubusercontent.com/hakkache/RealEstateBuddy/a890a7da899d84d879c702bec09b9d628671f758/data/Clean_Data_Step2.csv'
 },
 {
  'name':'hicham_mubawab_sale', 'source_domain':'mubawab.ma', 'transaction':'sale',
  'commit':'ad204e00ba8df9ee5a78b7ae6366709cd070d567',
  'url':'https://raw.githubusercontent.com/HichamBenelmahi/analyse-des-tendances-immobili-res-/ad204e00ba8df9ee5a78b7ae6366709cd070d567/data/clean_data/annonces_nettoyees_mubawab.csv'
 },
 {
  'name':'hicham_avito_rent', 'source_domain':'avito.ma', 'transaction':'rent',
  'commit':'ad204e00ba8df9ee5a78b7ae6366709cd070d567',
  'url':'https://raw.githubusercontent.com/HichamBenelmahi/analyse-des-tendances-immobili-res-/ad204e00ba8df9ee5a78b7ae6366709cd070d567/data/clean_data/avito_location_clean.csv'
 },
 {
  'name':'hicham_avito_sale', 'source_domain':'avito.ma', 'transaction':'sale',
  'commit':'ad204e00ba8df9ee5a78b7ae6366709cd070d567',
  'url':'https://raw.githubusercontent.com/HichamBenelmahi/analyse-des-tendances-immobili-res-/ad204e00ba8df9ee5a78b7ae6366709cd070d567/data/clean_data/avito_vendre_clean.csv'
 },
]

ALIASES={
 'source_id':['Property_ID','property_id','propertyid','id','ID','identifiant'],
 'city':['city','City','ville','Ville'],
 'district':['neighborhood','quartier','district','zone'],
 'price_mad':['Prix','prix','price','Price','prix_mad'],
 'surface_m2':['Surface','surface','surface_m2','superficie'],
 'rooms_count':['Piece','piece','pieces','pièces','nb_pieces','nombre_pieces','rooms'],
 'bedrooms_count':['Chambre','chambre','chambres','nb_chambres','nombre_chambres','bedrooms'],
 'bathrooms_count':['Salle_de_Bain','salle_de_bain','salles_de_bain','nb_salles_bain','nombre_salles_bain','bathrooms'],
 'property_type':['type_de_bien','type_bien','property_type','type'],
 'latitude':['latitude','lat'],
 'longitude':['longitude','lon','lng'],
 'title':['title','titre','Title','Titre'],
 'url':['url','URL','lien','link'],
}

def norm_header(s):
 return re.sub(r'[^a-z0-9]+','',str(s).lower())

def pick(row, names):
 direct={k:v for k,v in row.items()}
 folded={norm_header(k):v for k,v in row.items()}
 for n in names:
  if n in direct and str(direct[n]).strip() not in ('','nan','None','null'): return direct[n]
  v=folded.get(norm_header(n))
  if v is not None and str(v).strip() not in ('','nan','None','null'): return v
 return None

def source_id(v):
 if v is None:return None
 s=str(v).strip().strip('"').strip("'")
 if re.fullmatch(r'\d+\.0',s):s=s[:-2]
 m=re.fullmatch(r'\d+',s)
 return s if m else None

def num(v):
 if v is None:return None
 s=str(v).strip().replace('\u00a0',' ').replace(' ','').replace(',','.')
 m=re.search(r'-?\d+(?:\.\d+)?',s)
 if not m:return None
 try:return float(m.group())
 except:return None

def integer(v):
 x=num(v)
 if x is None:return None
 return int(round(x))

def txt(v):
 if v is None:return None
 s=' '.join(str(v).replace('\t',' ').replace('\r',' ').replace('\n',' ').split()).strip()
 return s or None

def download(url):
 req=urllib.request.Request(url,headers={'User-Agent':'AkarFinder-Q1D-public-dataset-export/1.0'})
 with urllib.request.urlopen(req,timeout=60) as r:return r.read()

rows=[]; dataset_summaries=[]
for ds in DATASETS:
 raw=download(ds['url']); digest=hashlib.sha256(raw).hexdigest()
 text=raw.decode('utf-8-sig',errors='replace')
 reader=csv.DictReader(io.StringIO(text))
 seen=0; usable=0
 for rec in reader:
  seen+=1; sid=source_id(pick(rec,ALIASES['source_id']))
  if not sid:continue
  usable+=1
  out={'source_domain':ds['source_domain'],'source_id':sid,'identity_key':f"{ds['source_domain']}|id:{sid}",
       'dataset':ds['name'],'dataset_commit':ds['commit'],'dataset_sha256':digest,
       'city':txt(pick(rec,ALIASES['city'])),'district':txt(pick(rec,ALIASES['district'])),
       'property_type':txt(pick(rec,ALIASES['property_type'])),'transaction_type':ds['transaction'],
       'price_mad':num(pick(rec,ALIASES['price_mad'])),'surface_m2':num(pick(rec,ALIASES['surface_m2'])),
       'rooms_count':integer(pick(rec,ALIASES['rooms_count'])),'bedrooms_count':integer(pick(rec,ALIASES['bedrooms_count'])),
       'bathrooms_count':integer(pick(rec,ALIASES['bathrooms_count'])),'latitude':num(pick(rec,ALIASES['latitude'])),
       'longitude':num(pick(rec,ALIASES['longitude'])),'title':txt(pick(rec,ALIASES['title'])),'url':txt(pick(rec,ALIASES['url']))}
  rows.append(out)
 dataset_summaries.append({'name':ds['name'],'commit':ds['commit'],'rows':seen,'usableSourceIds':usable,'sha256':digest,'headers':reader.fieldnames})

# Deterministic best row per exact source identity. More populated structured fields wins;
# ties resolve by dataset name then full JSON. No phone/contact field is ever retained.
fields=['city','district','property_type','transaction_type','price_mad','surface_m2','rooms_count','bedrooms_count','bathrooms_count','latitude','longitude','title','url']
def score(r):return sum(r.get(k) is not None for k in fields)
by={}
for r in sorted(rows,key=lambda x:(x['identity_key'],x['dataset'],json.dumps(x,sort_keys=True,ensure_ascii=False))):
 k=r['identity_key']; cur=by.get(k)
 if cur is None or score(r)>score(cur):by[k]=r
final=[by[k] for k in sorted(by)]
text=''.join(json.dumps(r,separators=(',',':'),ensure_ascii=False)+'\n' for r in final)
(OUT/'public-dataset-features.jsonl').write_text(text,encoding='utf-8')
summary={'schemaVersion':'q1d-public-dataset-features-v1','datasets':dataset_summaries,'rawRows':len(rows),'uniqueExactSourceIds':len(final),
 'sourceCounts':dict(Counter(r['source_domain'] for r in final)),'phoneFieldsExported':False,'sourceSiteFetches':0,'publicGitHubFetches':len(DATASETS),
 'databaseWrites':0,'productionWrites':0,'vercelDeployments':0,'sha256':hashlib.sha256(text.encode()).hexdigest()}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
