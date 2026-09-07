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

def infer_city(text):
 t=norm(text); hits=[]
 for m in CITY_RX.finditer(t):
  term=m.group(1); before=t[max(0,m.start()-20):m.start()].strip()
  if re.search(r'(route de|route d|route|road to|route vers)$',before): continue
  hits.append(ALIASES[term])
 if not hits:return None
 c=collections.Counter(hits).most_common()
 if len(c)>1 and c[0][1]==c[1][1]:return None
 return c[0][0]

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

def load_jsonl(p):
 with open(p,encoding='utf-8') as f:
  for line in f:
   if line.strip():yield json.loads(line)

public_url={}
for r in load_jsonl(PUBLIC/'public-dataset-features.jsonl'):
 if r.get('url'):public_url.setdefault(r['identity_key'],r['url'])
rec_url={r['representation_key']:r['url'] for r in load_jsonl(DBREC/'recovered-search-ready.jsonl')}

OUT.mkdir(parents=True,exist_ok=True)
fields=collections.Counter();domains=collections.Counter();before=after=total=0;examples=[];h=hashlib.sha256()
with open(OUT/'new-search-ready.jsonl','w',encoding='utf-8') as out:
 for i,r in enumerate(load_jsonl(Q1D/'manifest-q1d.jsonl')):
  total+=1;f=r['features'];key=r['representation_key'];sid=r['source_identity']
  url=sid if r['identity_kind']=='url' and isinstance(sid,str) and sid.startswith(('http://','https://')) else public_url.get(key) or rec_url.get(key)
  c=f.get('city');p=f.get('price_mad');s=f.get('surface_m2');title=f.get('title') or ''
  was=bool(url and c and p is not None and p>0 and s is not None and s>0)
  if was:before+=1
  text=(url or '')+' '+title
  nc=c or infer_city(text)
  np=p if p is not None else infer_one(PRICE_RX,text,50,1_000_000_000)
  ns=s if s is not None else infer_one(SURF_RX,text,5,200_000)
  if not c and nc:fields['city']+=1
  if p is None and np is not None:fields['price']+=1
  if s is None and ns is not None:fields['surface']+=1
  now=bool(url and nc and np is not None and np>0 and ns is not None and ns>0)
  if now:after+=1
  if now and not was:
   row={'row_index':i,'representation_key':key,'source_domain':r['normalized_source_domain'],'url':url,'city':nc,'price_mad':np,'surface_m2':ns,'title':title or None,'repair_basis':'exact_url_or_existing_title_literal','search_ready':True}
   txt=json.dumps(row,separators=(',',':'),ensure_ascii=False)+'\n';out.write(txt);h.update(txt.encode())
   domains[r['normalized_source_domain']]+=1
   if len(examples)<25:examples.append(row)
assert total==EXPECTED
summary={'schemaVersion':'q4a-url-title-repair-v1','inputRepresentations':total,'baselineSearchReady':before,'repairedSearchReady':after,'netNewSearchReady':after-before,'fieldGains':dict(fields),'netNewByDomain':dict(domains),'repairSources':['exact URL','existing Q1D title'],'pageFetches':0,'sourceSiteFetches':0,'databaseWrites':0,'productionWrites':0,'vercelDeployments':0,'freshnessIsGate':False,'liveConfidenceIsGate':False,'clusteringIsGate':False,'urlInvented':False,'newRowsSha256':h.hexdigest(),'examples':examples}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
