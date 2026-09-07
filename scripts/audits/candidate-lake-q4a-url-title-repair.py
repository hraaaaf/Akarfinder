#!/usr/bin/env python3
import json,re,unicodedata,urllib.parse,collections,hashlib,os
from pathlib import Path

Q1D=Path(os.getenv('Q4A_Q1D_ROOT','.tmp/q4a-repair-input/q1d'))
PUBLIC=Path(os.getenv('Q4A_PUBLIC_ROOT','.tmp/q4a-repair-input/public'))
DBREC=Path(os.getenv('Q4A_DBREC_ROOT','.tmp/q4a-repair-input/dbrec'))
OUT=Path(os.getenv('Q4A_REPAIR_OUT','.tmp/q4a-url-title-repair'))
EXPECTED=251_046

ALIASES={
'rabat':'Rabat','casablanca':'Casablanca','casa':'Casablanca','marrakech':'Marrakech','agadir':'Agadir','tanger':'Tanger','tangier':'Tanger','fes':'Fès','fez':'Fès','meknes':'Meknès','tetouan':'Tétouan','kenitra':'Kénitra','sale':'Salé','temara':'Témara','mohammedia':'Mohammedia','el jadida':'El Jadida','essaouira':'Essaouira','oujda':'Oujda','ifrane':'Ifrane','saidia':'Saidia','beni mellal':'Béni Mellal','khouribga':'Khouribga','safi':'Safi','settat':'Settat','berrechid':'Berrechid','larache':'Larache','nador':'Nador','dakhla':'Dakhla','laayoune':'Laâyoune','youssoufia':'Youssoufia','chefchaouen':'Chefchaouen','martil':'Martil','bouskoura':'Bouskoura','dar bouazza':'Dar Bouazza','harhoura':'Harhoura','asilah':'Asilah','azrou':'Azrou','tiznit':'Tiznit','taroudant':'Taroudant','ouarzazate':'Ouarzazate'}
CITY_RX=re.compile(r'(?<![a-z0-9])('+'|'.join(sorted(map(re.escape,ALIASES),key=len,reverse=True))+r')(?![a-z0-9])')
SURF_RX=re.compile(r'(?<!\d)(\d{1,3}(?:[ .]\d{3})+|\d{1,6})(?:[.,]\d{1,2})?\s*(?:m2|m²|m 2|metres? carres?|mètres? carrés?)(?!\w)',re.I)
PRICE_RX=re.compile(r'(?<!\d)(\d{1,3}(?:[ .,_]\d{3})+|\d{2,9})(?:[.,]\d{1,2})?\s*(?:dh|dhs|mad)(?!\w)',re.I)


def norm(s):
 s=urllib.parse.unquote(str(s or '')).lower().replace('_',' ').replace('-',' ')
 s=unicodedata.normalize('NFKD',s)
 s=''.join(c for c in s if not unicodedata.combining(c))
 return re.sub(r'\s+',' ',re.sub(r'[^a-z0-9]+',' ',s)).strip()

def parse_num(s):
 s=s.strip().replace('_',' ')
 if re.fullmatch(r'\d{1,3}(?:[ .]\d{3})+',s): s=re.sub(r'[ .]','',s)
 else:s=s.replace(' ','').replace(',','.')
 try:return float(s)
 except:return None

def infer_one(rx,text,lo,hi):
 raw=urllib.parse.unquote(str(text or '')).replace('_',' ').replace('-',' ')
 vals=[]
 for m in rx.finditer(raw):
  v=parse_num(m.group(1))
  if v and lo<=v<=hi: vals.append(round(v,2))
 vals=set(vals)
 return next(iter(vals)) if len(vals)==1 else None

def city_hits(text):
 t=norm(text); hits=[]
 for m in CITY_RX.finditer(t):
  term=m.group(1); before=t[max(0,m.start()-20):m.start()].strip()
  if re.search(r'(route de|route d|route|road to|route vers)$',before): continue
  hits.append(ALIASES[term])
 return hits

def infer_city_generic(text):
 hits=city_hits(text)
 if not hits:return None
 c=collections.Counter(hits).most_common()
 if len(c)>1 and c[0][1]==c[1][1]:return None
 return c[0][0]

def infer_city_strong(url,title,domain):
 # Strong source-specific URL patterns for individual listing geography.
 u=norm(url)
 if domain=='agenz.ma':
  m=re.search(r'\bimmo ([a-z ]+?) (?:vente|location)\b',u)
  if m:
   v=infer_city_generic(m.group(1))
   if v:return v
 if domain=='sarouty.ma':
  # Typical detail slugs contain the city immediately after transaction/type.
  hits=city_hits(url)
  if len(set(hits))==1:return hits[0]
 # Generic URL city only when exactly one city appears.
 uh=city_hits(url)
 if len(set(uh))==1:return uh[0]
 # Title only when exactly one city appears.
 th=city_hits(title)
 if len(set(th))==1:return th[0]
 return None

def load_jsonl(p):
 with open(p,encoding='utf-8') as f:
  for line in f:
   if line.strip():yield json.loads(line)

public_url={}
for r in load_jsonl(PUBLIC/'public-dataset-features.jsonl'):
 if r.get('url'):public_url.setdefault(r['identity_key'],r['url'])
rec_url={r['representation_key']:r['url'] for r in load_jsonl(DBREC/'recovered-search-ready.jsonl')}

OUT.mkdir(parents=True,exist_ok=True)
fields=collections.Counter();domains=collections.Counter();conflicts=collections.Counter();before=after=total=0;examples=[];conflict_examples=[];h=hashlib.sha256()
with open(OUT/'new-search-ready.jsonl','w',encoding='utf-8') as out:
 for i,r in enumerate(load_jsonl(Q1D/'manifest-q1d.jsonl')):
  total+=1;f=r['features'];key=r['representation_key'];sid=r['source_identity'];domain=r['normalized_source_domain']
  url=sid if r['identity_kind']=='url' and isinstance(sid,str) and sid.startswith(('http://','https://')) else public_url.get(key) or rec_url.get(key)
  c=f.get('city');p=f.get('price_mad');s=f.get('surface_m2');title=f.get('title') or ''
  was=bool(url and c and p is not None and p>0 and s is not None and s>0)
  if was:before+=1

  literal_city=infer_city_strong(url or '',title,domain)
  literal_price=infer_one(PRICE_RX,title,50,1_000_000_000)
  literal_surface=infer_one(SURF_RX,title,5,200_000)
  # URL can fill missing numeric fields, but explicit title literals may reconcile existing conflicts.
  url_price=infer_one(PRICE_RX,url or '',50,1_000_000_000)
  url_surface=infer_one(SURF_RX,url or '',5,200_000)

  nc=c
  if literal_city:
   if c and norm(c)!=norm(literal_city):
    conflicts['city']+=1; nc=literal_city
   elif not c: nc=literal_city; fields['city']+=1
  elif not c:
   nc=infer_city_generic((url or '')+' '+title)
   if nc:fields['city']+=1

  np=p
  if literal_price is not None:
   if p is not None and abs(float(p)-literal_price)>max(1,0.005*literal_price):
    conflicts['price']+=1; np=literal_price
   elif p is None: np=literal_price; fields['price']+=1
  elif p is None and url_price is not None:
   np=url_price;fields['price']+=1

  ns=s
  if literal_surface is not None:
   if s is not None and abs(float(s)-literal_surface)>max(1,0.01*literal_surface):
    conflicts['surface']+=1; ns=literal_surface
   elif s is None: ns=literal_surface; fields['surface']+=1
  elif s is None and url_surface is not None:
   ns=url_surface;fields['surface']+=1

  now=bool(url and nc and np is not None and np>0 and ns is not None and ns>0)
  if now:after+=1
  if now and (not was or nc!=c or np!=p or ns!=s):
   row={'row_index':i,'representation_key':key,'source_domain':domain,'url':url,'city':nc,'price_mad':np,'surface_m2':ns,'title':title or None,'repair_basis':'explicit_title_or_exact_url_reconciliation_v2','search_ready':True,'reconciled':{'city':nc!=c,'price':np!=p,'surface':ns!=s}}
   txt=json.dumps(row,separators=(',',':'),ensure_ascii=False)+'\n';out.write(txt);h.update(txt.encode())
   if not was:domains[domain]+=1
   if len(examples)<25:examples.append(row)
  if len(conflict_examples)<25 and ((c and nc!=c) or (p is not None and np!=p) or (s is not None and ns!=s)):
   conflict_examples.append({'row_index':i,'source_domain':domain,'url':url,'title':title or None,'before':{'city':c,'price_mad':p,'surface_m2':s},'after':{'city':nc,'price_mad':np,'surface_m2':ns}})
assert total==EXPECTED
summary={'schemaVersion':'q4a-url-title-repair-v2-reconciled','inputRepresentations':total,'baselineSearchReady':before,'repairedSearchReady':after,'netNewSearchReady':after-before,'fieldGains':dict(fields),'reconciledConflicts':dict(conflicts),'netNewByDomain':dict(domains),'repairSources':['exact URL','existing Q1D title'],'pageFetches':0,'sourceSiteFetches':0,'databaseWrites':0,'productionWrites':0,'vercelDeployments':0,'freshnessIsGate':False,'liveConfidenceIsGate':False,'clusteringIsGate':False,'urlInvented':False,'newRowsSha256':h.hexdigest(),'examples':examples,'conflictExamples':conflict_examples}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
