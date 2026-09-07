#!/usr/bin/env python3
import csv, hashlib, io, json, os, re, urllib.request
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

OUT=Path(os.getenv('Q1D_PUBLIC_OUT','.tmp/q1d-public-features'))
OUT.mkdir(parents=True,exist_ok=True)
DATASETS=[
 {'name':'realestatebuddy_mubawab','source_domain':'mubawab.ma','transaction':None,'price_is_mad':False,'commit':'a890a7da899d84d879c702bec09b9d628671f758','url':'https://raw.githubusercontent.com/hakkache/RealEstateBuddy/a890a7da899d84d879c702bec09b9d628671f758/data/Clean_Data_Step2.csv'},
 {'name':'hicham_mubawab_sale','source_domain':'mubawab.ma','transaction':'buy','price_is_mad':True,'commit':'ad204e00ba8df9ee5a78b7ae6366709cd070d567','url':'https://raw.githubusercontent.com/HichamBenelmahi/analyse-des-tendances-immobili-res-/ad204e00ba8df9ee5a78b7ae6366709cd070d567/data/clean_data/annonces_nettoyees_mubawab.csv'},
 {'name':'hicham_avito_rent','source_domain':'avito.ma','transaction':'rent','price_is_mad':True,'commit':'ad204e00ba8df9ee5a78b7ae6366709cd070d567','url':'https://raw.githubusercontent.com/HichamBenelmahi/analyse-des-tendances-immobili-res-/ad204e00ba8df9ee5a78b7ae6366709cd070d567/data/clean_data/avito_location_clean.csv'},
 {'name':'hicham_avito_sale','source_domain':'avito.ma','transaction':'buy','price_is_mad':True,'commit':'ad204e00ba8df9ee5a78b7ae6366709cd070d567','url':'https://raw.githubusercontent.com/HichamBenelmahi/analyse-des-tendances-immobili-res-/ad204e00ba8df9ee5a78b7ae6366709cd070d567/data/clean_data/avito_vendre_clean.csv'},
]
ALIASES={
 'source_id':['Property_ID','property_id','propertyid','id','ID','identifiant'], 'city':['city','City','ville','Ville'],
 'district':['neighborhood','quartier','district','zone'], 'price':['Prix','prix','price','Price','prix_mad'],
 'currency':['Devise','devise','currency','currency_code'], 'surface_m2':['Surface','surface','surface_m2','superficie'],
 'rooms_count':['Piece','piece','pieces','pièces','nb_pieces','nombre_pieces','rooms'],
 'bedrooms_count':['Chambre','chambre','chambres','nb_chambres','nombre_chambres','bedrooms'],
 'bathrooms_count':['Salle_de_Bain','salle_de_bain','salles_de_bain','nb_salle_de_bain','nb_salles_bain','nombre_salles_bain','bathrooms'],
 'property_type':['type_de_bien','type_bien','property_type','type'], 'latitude':['latitude','lat'], 'longitude':['longitude','lon','lng'],
 'title':['title','titre','Title','Titre'], 'url':['url','URL','url_annonce','lien','link'], 'address_text':['location','adresse','address','localisation'],
}
def norm_header(s):return re.sub(r'[^a-z0-9]+','',str(s).lower())
def pick(row,names):
 direct=dict(row); folded={norm_header(k):v for k,v in row.items()}
 for n in names:
  for v in ([direct[n]] if n in direct else [])+([folded[norm_header(n)]] if norm_header(n) in folded else []):
   if v is not None and str(v).strip() not in ('','nan','None','null'):return v
 return None
def clean_source_id(v):
 if v is None:return None
 s=str(v).strip().strip('"').strip("'")
 if re.fullmatch(r'\d+\.0',s):s=s[:-2]
 return s if re.fullmatch(r'\d+',s) else None
def id_from_url(v):
 if not v:return None
 vals=re.findall(r'(?<!\d)(\d{5,})(?!\d)',urlsplit(str(v)).path)
 return vals[-1] if vals else None
def num(v):
 if v is None:return None
 s=str(v).strip().replace('\u00a0',' ').replace(' ','').replace(',','.')
 m=re.search(r'-?\d+(?:\.\d+)?',s)
 if not m:return None
 try:return float(m.group())
 except:return None
def integer(v):
 x=num(v); return None if x is None else int(round(x))
def txt(v):
 if v is None:return None
 s=' '.join(str(v).replace('\t',' ').replace('\r',' ').replace('\n',' ').split()).strip(); return s or None
def mad_price(rec,ds):
 value=num(pick(rec,ALIASES['price']))
 if value is None or value<=0:return None
 if ds['price_is_mad']:return value
 cur=txt(pick(rec,ALIASES['currency']))
 if cur is None:return None
 return value if re.sub(r'[^a-z0-9]+','',cur.lower()) in {'dh','dhs','mad'} else None
def positive(v):
 x=num(v); return x if x is not None and x>0 else None
def geo(v,lo,hi):
 x=num(v); return x if x is not None and lo<=x<=hi else None
def download(url):
 req=urllib.request.Request(url,headers={'User-Agent':'AkarFinder-Q1D-public-dataset-export/1.2'})
 with urllib.request.urlopen(req,timeout=90) as r:return r.read()
rows=[]; dataset_summaries=[]
for ds in DATASETS:
 raw=download(ds['url']); digest=hashlib.sha256(raw).hexdigest(); reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig',errors='replace'))); seen=usable=0
 for rec in reader:
  seen+=1; urlv=txt(pick(rec,ALIASES['url'])); sid=clean_source_id(pick(rec,ALIASES['source_id'])) or id_from_url(urlv)
  if not sid:continue
  usable+=1
  rows.append({'source_domain':ds['source_domain'],'source_id':sid,'identity_key':f"{ds['source_domain']}|id:{sid}",'dataset':ds['name'],'dataset_commit':ds['commit'],'dataset_sha256':digest,
   'city':txt(pick(rec,ALIASES['city'])),'district':txt(pick(rec,ALIASES['district'])),'property_type':txt(pick(rec,ALIASES['property_type'])),'transaction_type':ds['transaction'],
   'price_mad':mad_price(rec,ds),'surface_m2':positive(pick(rec,ALIASES['surface_m2'])),'rooms_count':integer(pick(rec,ALIASES['rooms_count'])),'bedrooms_count':integer(pick(rec,ALIASES['bedrooms_count'])),
   'bathrooms_count':integer(pick(rec,ALIASES['bathrooms_count'])),'latitude':geo(pick(rec,ALIASES['latitude']),-90,90),'longitude':geo(pick(rec,ALIASES['longitude']),-180,180),
   'title':txt(pick(rec,ALIASES['title'])),'address_text':txt(pick(rec,ALIASES['address_text'])),'url':urlv})
 dataset_summaries.append({'name':ds['name'],'commit':ds['commit'],'rows':seen,'usableSourceIds':usable,'sha256':digest,'headers':reader.fieldnames})
fields=['city','district','property_type','transaction_type','price_mad','surface_m2','rooms_count','bedrooms_count','bathrooms_count','latitude','longitude','title','address_text','url']
def score(r):return sum(r.get(k) is not None for k in fields)
by={}
for r in sorted(rows,key=lambda x:(x['identity_key'],x['dataset'],json.dumps(x,sort_keys=True,ensure_ascii=False))):
 k=r['identity_key']; cur=by.get(k)
 if cur is None or score(r)>score(cur):by[k]=r
final=[by[k] for k in sorted(by)]; text=''.join(json.dumps(r,separators=(',',':'),ensure_ascii=False)+'\n' for r in final)
(OUT/'public-dataset-features.jsonl').write_text(text,encoding='utf-8')
summary={'schemaVersion':'q1d-public-dataset-features-v2','datasets':dataset_summaries,'rawRows':len(rows),'uniqueExactSourceIds':len(final),'sourceCounts':dict(Counter(r['source_domain'] for r in final)),
 'phoneFieldsExported':False,'sourceSiteFetches':0,'publicGitHubFetches':len(DATASETS),'databaseWrites':0,'productionWrites':0,'vercelDeployments':0,'sha256':hashlib.sha256(text.encode()).hexdigest()}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8'); print(json.dumps(summary,indent=2,ensure_ascii=False))
