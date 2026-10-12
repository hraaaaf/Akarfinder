#!/usr/bin/env python3
"""Bounded, read-only real listing detail evidence; never promote inferred fields."""
from __future__ import annotations
import hashlib,json,os,re,time,urllib.parse,urllib.request,urllib.robotparser
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from datetime import datetime,timezone

HOST='www.marocimmo.com'
BASE='https://'+HOST
UA='AkarFinder-MarocImmo-PrimaryField-Audit/1.0 (+https://akarfinder.ma)'
RECORD=re.compile(r'^/fr/annonces/([^/?#]+)-(\d+)/?$')
OUT='marocimmo-detail-evidence-v1'
def primary_url(value):
 try:
  u=urllib.parse.urlsplit(value)
  if u.scheme!='https' or u.netloc!=HOST or u.username or u.password or u.query or u.fragment:return None
  m=RECORD.fullmatch(urllib.parse.unquote(u.path))
  if not m:return None
  return {'url':BASE+u.path,'source_id':'marocimmo:'+m[2]}
 except Exception:return None
def select_samples(urls,n=12):
 d={r['source_id']:r for x in urls if (r:=primary_url(x)) is not None}
 return sorted(d.values(),key=lambda x:hashlib.sha256(x['source_id'].encode()).hexdigest())[:n]
class Metadata(HTMLParser):
 def __init__(self):
  super().__init__();self.meta={};self.json_scripts=[];self._active=None;self._chunks=[]
 def handle_starttag(self,tag,attrs):
  at=dict(attrs)
  if tag=='meta':
   k=(at.get('property') or at.get('name') or '').lower()
   if k in ('og:title','og:description','description') and k not in self.meta:self.meta[k]=(at.get('content') or '')[:200]
  if tag=='script' and (at.get('type') or '').lower()=='application/ld+json':self._active='json';self._chunks=[]
  elif tag=='title' and self._active is None:self._active='title';self._chunks=[]
 def handle_data(self,data):
  if self._active is not None:self._chunks.append(data)
 def handle_endtag(self,tag):
  if self._active=='json' and tag=='script':
   self.json_scripts.append(''.join(self._chunks)[:200000]);self._active=None;self._chunks=[]
  elif self._active=='title' and tag=='title':
   self.meta['title']=''.join(self._chunks).strip()[:200];self._active=None;self._chunks=[]
def nodes_from_ld(scripts):
 nodes=[]
 for s in scripts[:25]:
  try:
   j=json.loads(s);pending=j if isinstance(j,list) else [j]
   while pending:
    x=pending.pop()
    if isinstance(x,list):pending.extend(x)
    elif isinstance(x,dict):
     nodes.append(x)
     if isinstance(x.get('@graph'),list):pending.extend(x['@graph'])
  except (ValueError,TypeError):continue
 return nodes
def normalize_ref(raw):
 if not isinstance(raw,str):return None
 try:
  u=urllib.parse.urlsplit(raw)
  return 'https://'+HOST+u.path.rstrip('/') if u.scheme=='https' and u.netloc==HOST else None
 except Exception:return None
def unique_primary_description_area(description):
 if not isinstance(description,str):return None
 raw=description.replace('\u00a0',' ').replace('\u202f',' ')
 if re.search(r'\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?\s*m(?:²|2)(?=$|[^\w])',raw,re.I):return None
 values=set()
 for m in re.finditer(r'(?<!\d)(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)(?=$|[^\w])',raw,re.I):
  before=raw[max(0,m.start()-20):m.start()]
  if re.search(r'(?:MAD|DH|DHS)\s*/\s*$',before,re.I):continue
  value=float(m.group(1).replace(',','.'))
  if 5<=value<=100000:values.add(value)
 return next(iter(values)) if len(values)==1 else None

def parse_primary_html(html,page):
 info=Metadata();info.feed(html)
 nodes=nodes_from_ld(info.json_scripts)
 valid={page.rstrip('/')}
 exact=[n for n in nodes if any(normalize_ref(n.get(k)) in valid for k in ('url','@id'))]
 matched=[n for n in exact if isinstance(n.get('offers'),(dict,list)) or
  any(t in ('RealEstateListing','Apartment','House','SingleFamilyResidence','Residence','Product') for t in ([n.get('@type')] if isinstance(n.get('@type'),str) else n.get('@type',[]) or []))]
 field={'price_mad':None,'surface_m2':None,'city':None,'district':None}
 shape={}
 if len(matched)==1:
  matched_node=matched[0]
  addr=matched_node.get('address')
  size=matched_node.get('floorSize')
  description=str(matched_node.get('description') or '')[:5000]
  shape={'primary_keys':sorted(str(k) for k in matched_node.keys())[:50],
   'address_kind':type(addr).__name__,
   'address_keys':sorted(str(k) for k in addr.keys()) if isinstance(addr,dict) else [],
   'floor_size_kind':type(size).__name__,
   'mainEntity_kind':type(matched_node.get('mainEntity')).__name__,
   'mainEntity_keys':sorted(str(k) for k in matched_node.get('mainEntity',{}).keys()) if isinstance(matched_node.get('mainEntity'),dict) else [],
   'has_labeled_area_in_description':bool(re.search(r'\d+\s*m(?:²|2)',description,re.I))}

  x=matched[0]
  offers=x.get('offers');offers=offers if isinstance(offers,list) else [offers]
  prices=set()
  for o in offers:
   if not isinstance(o,dict) or str(o.get('priceCurrency') or '').upper()!='MAD':continue
   try:
    value=float(o.get('price'))
    if value.is_integer() and 500<=value<=1000000000:prices.add(int(value))
   except (ValueError,TypeError,OverflowError):pass
  if len(prices)==1:field['price_mad']=next(iter(prices))
  main=x.get('mainEntity')
  nested_id=(main or {}).get('@id') if isinstance(main,dict) else None
  attached_main=isinstance(main,dict) and (not nested_id or isinstance(nested_id,str) and
    (nested_id.startswith('#') or normalize_ref(nested_id)==page.rstrip('/')))
  if not attached_main:main={}
  nested_address=main.get('address')
  nested_place=main.get('containedInPlace')
  shape['main_address_keys']=sorted(str(k) for k in nested_address.keys()) if isinstance(nested_address,dict) else []
  shape['main_place_kind']=type(nested_place).__name__
  shape['main_place_keys']=sorted(str(k) for k in nested_place.keys()) if isinstance(nested_place,dict) else []
  shape['nested_identity_accepted']=bool(attached_main)
  def structured_area(value):
   if not isinstance(value,dict) or str(value.get('unitCode') or '').upper()!='MTK':return None
   try:
    n=float(value.get('value'))
    return n if 5<=n<=100000 else None
   except (TypeError,ValueError,OverflowError):return None
  primary_area=structured_area(x.get('floorSize') or x.get('floor_size'))
  nested_area=structured_area(main.get('floorSize') or main.get('floor_size'))
  description_area=unique_primary_description_area(x.get('description'))
  name_area=unique_primary_description_area(x.get('name'))
  areas=set(v for v in (primary_area,nested_area,description_area,name_area) if v is not None)
  shape['area_evidence_sources']=[name for name,value in [('root_floorSize',primary_area),('main_floorSize',nested_area),('primary_description',description_area),('primary_name',name_area)] if value is not None]
  area_conflict=len(areas)>1
  field['surface_m2']=next(iter(areas)) if len(areas)==1 else None
  address=x.get('address')
  if not isinstance(address,dict):address=nested_address
  if isinstance(address,dict):
   for key,target in [('addressLocality','city'),('neighborhood','district')]:
    value=address.get(key)
    if isinstance(value,str) and 2<=len(value.strip())<=75 and not re.search(r'[@\d]',value):field[target]=value.strip()
 return {'primary_structured_nodes_matching_url':len(matched),'jsonld_nodes_total':len(nodes),
   'fields':field,'surface_evidence_conflict':len(areas)>1 if len(matched)==1 else False,'schema_shape_only':shape,'fields_present':sum(v is not None for v in field.values()),
   'complete_four_detail_fields':all(v is not None for v in field.values()) and len(matched)==1,
   'title_observed':bool(info.meta.get('title') or info.meta.get('og:title')),
   'freshness_certified':False,'availability_certified':False,'physical_uniqueness_certified':False}
class SafeRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  origin=urllib.parse.urlsplit(req.full_url)
  destination=urllib.parse.urlsplit(newurl)
  if destination.scheme!='https' or destination.netloc!=HOST or not RECORD.fullmatch(urllib.parse.unquote(destination.path)):
   raise ValueError('untrusted_redirect')
  return super().redirect_request(req,fp,code,msg,headers,newurl)
def get(url,timeout=18):
 request=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/html,application/ld+json;q=0.8,*/*;q=0.4'})
 with urllib.request.build_opener(SafeRedirect()).open(request,timeout=timeout) as res:
  if res.status!=200:return res.status,res.url,''
  content_type=res.headers.get('Content-Type','')
  if 'html' not in content_type and 'text/plain' not in content_type:return 200,res.url,''
  raw=res.read(3000001)
  if len(raw)>3000000:raise ValueError('oversized_html')
  return res.status,res.url,raw.decode('utf-8','replace')
def main():
 paths=Path(os.getenv('MAROCIMMO_SITEMAP_URLS','.tmp/sitemap/urls.txt')).read_text(encoding='utf-8').splitlines()
 selected=select_samples(paths,12)
 outcomes=[];halt=None;requests=0;robots_status=None
 try:
  robots_status,_,txt=get(BASE+'/robots.txt',timeout=12)
  if robots_status!=200 or not txt.strip() or len(txt)>100000:raise ValueError('robots_unavailable')
  robots=urllib.robotparser.RobotFileParser();robots.parse(txt.splitlines())
 except Exception:halt='robots_unavailable_fail_closed';robots=None
 for item in selected:
  if halt:break
  if not robots.can_fetch(UA,item['url']):outcomes.append({**item,'state':'robots_disallowed'});continue
  if requests:time.sleep(1.8)
  requests+=1
  try:
   status,final,html=get(item['url'])
   if status!=200 or final!=item['url'] or not html:
    outcomes.append({**item,'state':'not_primary_html', 'http_status':status});continue
   parsed=parse_primary_html(html,item['url'])
   outcomes.append({**item,'state':'primary_page_observed','http_status':status,**parsed})
  except Exception as e:
   code=getattr(e,'code',None)
   if code in (403,429):halt='http_'+str(code)
   outcomes.append({**item,'state':'http_'+str(code) if code else 'network_or_redirect_error','http_status':code})
   if halt:break
 report={'schema_version':'AKARFINDER_MAROCIMMO_DETAIL_EVIDENCE_V1','semantics':'primary_individual_page_structured_data_only_not_available_or_fresh_certification',
 'as_of':datetime.now(timezone.utc).isoformat(),'sitemap_candidates_source_id_distinct':len({primary_url(u)['source_id'] for u in paths if primary_url(u)}),
 'sample_selected':len(selected),'robots_status':robots_status,'detail_requests':requests,'http200_primary_pages':sum(x['state']=='primary_page_observed' for x in outcomes),
 'primary_schema_match':sum(x.get('primary_structured_nodes_matching_url')==1 for x in outcomes),'four_fields_structured_same_primary':sum(x.get('complete_four_detail_fields') is True for x in outcomes),
 'halted_reason':halt,'database_access':0,'database_writes':0,'published':0,
 'note':'A sitemap link or HTTP200 does not prove offer still available, current date, reuse rights, or physical uniqueness.'}
 Path(OUT+'.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 Path(OUT+'.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in outcomes),encoding='utf-8')
 print(json.dumps(report,ensure_ascii=False,indent=2))
 if halt or not report['http200_primary_pages']:raise SystemExit(2)
if __name__=='__main__':main()
