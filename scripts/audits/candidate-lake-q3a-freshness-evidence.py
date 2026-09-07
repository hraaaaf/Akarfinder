#!/usr/bin/env python3
import hashlib,json,os,re
from collections import Counter,defaultdict
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlsplit,urlunsplit

Q1D=Path(os.getenv('Q3A_Q1D_ROOT','.tmp/q3a-input/q1d'))
Q2C=Path(os.getenv('Q3A_Q2C_ROOT','.tmp/q3a-input/q2c'))
DB=Path(os.getenv('Q3A_DB_ROOT','.tmp/q3a-input/db'))
OUT=Path(os.getenv('Q3A_OUT','.tmp/q3a-freshness'))
EXPECTED_ROWS=251_046
EXPECTED_CLUSTERS=250_774
ID_DOMAINS={'mubawab.ma','avito.ma'}


def load_jsonl(p):
 with open(p,encoding='utf-8') as f:
  for line in f:
   if line.strip():yield json.loads(line)

def domain(v):
 return (v or '').strip().lower().removeprefix('www.')
def canon_url(v):
 if not v:return None
 try:
  p=urlsplit(str(v).strip()); host=domain(p.hostname); net=host+(f':{p.port}' if p.port else '')
  if not host:return None
  path=p.path.rstrip('/') or '/'
  return urlunsplit(((p.scheme or 'https').lower(),net,path,p.query,''))
 except:return None
def url_key(d,u):
 c=canon_url(u);return f'{domain(d)}|url:{c}' if c else None
def source_id(d,u):
 d=domain(d)
 if d not in ID_DOMAINS or not u:return None
 vals=re.findall(r'(?<!\d)(\d{5,})(?!\d)',urlsplit(str(u)).path)
 return vals[-1] if vals else None
def parse_dt(v):
 if not v:return None
 try:return datetime.fromisoformat(str(v).replace('Z','+00:00')).astimezone(timezone.utc)
 except:return None
def age_days(now,dt):
 if not dt:return None
 return max(0.0,(now-dt).total_seconds()/86400.0)
def age_bucket(prefix,age):
 if age is None:return prefix+'_undated'
 if age<=7:return prefix+'_7d'
 if age<=30:return prefix+'_30d'
 if age<=90:return prefix+'_90d'
 return prefix+'_older'

def aggregate_listing(rows):
 pids={str(r.get('property_listing_id')) for r in rows if r.get('property_listing_id') is not None}
 if len(pids)>1:return None
 active=[r for r in rows if r.get('is_active') is True and parse_dt(r.get('last_seen_at'))]
 latest=max(active,key=lambda r:parse_dt(r['last_seen_at'])) if active else None
 observed=[r for r in rows if parse_dt(r.get('last_seen_at'))]
 latest_obs=max(observed,key=lambda r:parse_dt(r['last_seen_at'])) if observed else None
 return {'active':latest,'observed':latest_obs,'rows':len(rows),'property_listing_ids':sorted(pids)}
def aggregate_seed(rows):
 urls={canon_url(r.get('canonical_url')) for r in rows if canon_url(r.get('canonical_url'))}
 fresh=[r for r in rows if r.get('freshness_status')=='fresh_confirmed' and parse_dt(r.get('fresh_last_seen_at'))]
 latest_fresh=max(fresh,key=lambda r:parse_dt(r['fresh_last_seen_at'])) if fresh else None
 obs=[r for r in rows if parse_dt(r.get('last_observed_at'))]
 latest_obs=max(obs,key=lambda r:parse_dt(r['last_observed_at'])) if obs else None
 stale=any(r.get('freshness_status')=='stale' for r in rows)
 undated_fresh=any(r.get('freshness_status')=='fresh_confirmed' and not parse_dt(r.get('fresh_last_seen_at')) for r in rows)
 return {'fresh':latest_fresh,'observed':latest_obs,'stale':stale,'undated_fresh':undated_fresh,'rows':len(rows),'urls':sorted(urls)}

def make_maps(seeds,ls):
 seed_url_b=defaultdict(list);seed_id_b=defaultdict(list);ls_url_b=defaultdict(list);ls_id_b=defaultdict(list)
 for r in seeds:
  d=domain(r.get('source_domain') or (urlsplit(r.get('canonical_url') or '').hostname or ''))
  u=r.get('canonical_url');uk=url_key(d,u)
  if uk:seed_url_b[uk].append(r)
  sid=source_id(d,u)
  if sid:seed_id_b[f'{d}|id:{sid}'].append(r)
 for r in ls:
  seen=set()
  for u in (r.get('listing_url'),r.get('source_url')):
   if not u:continue
   d=domain(urlsplit(u).hostname or '');uk=url_key(d,u)
   if uk and uk not in seen:ls_url_b[uk].append(r);seen.add(uk)
   sid=source_id(d,u);ik=f'{d}|id:{sid}' if sid else None
   if ik and ik not in seen:ls_id_b[ik].append(r);seen.add(ik)
 seed_url={k:aggregate_seed(v) for k,v in seed_url_b.items()}
 # ID matches fail closed when one source ID resolves to multiple canonical URLs.
 seed_id={};seed_id_amb=0
 for k,v in seed_id_b.items():
  a=aggregate_seed(v)
  if len(a['urls'])==1:seed_id[k]=a
  else:seed_id_amb+=1
 ls_url={};ls_url_amb=0
 for k,v in ls_url_b.items():
  a=aggregate_listing(v)
  if a:ls_url[k]=a
  else:ls_url_amb+=1
 ls_id={};ls_id_amb=0
 for k,v in ls_id_b.items():
  urls=set()
  for r in v:
   for u in (r.get('listing_url'),r.get('source_url')):
    if u and source_id(domain(urlsplit(u).hostname or ''),u) and f"{domain(urlsplit(u).hostname or '')}|id:{source_id(domain(urlsplit(u).hostname or ''),u)}"==k:
     c=canon_url(u)
     if c:urls.add(c)
  a=aggregate_listing(v)
  if a and len(urls)==1:ls_id[k]=a
  else:ls_id_amb+=1
 return seed_url,seed_id,ls_url,ls_id,{'seedIdAmbiguousKeysExcluded':seed_id_amb,'listingUrlAmbiguousKeysExcluded':ls_url_amb,'listingIdAmbiguousKeysExcluded':ls_id_amb}

def evidence_for(base,now,maps):
 seed_url,seed_id,ls_url,ls_id,_=maps;d=base['normalized_source_domain'];kind=base['identity_kind']
 if kind=='url':
  key=url_key(d,base['source_identity']);s=seed_url.get(key);l=ls_url.get(key);basis='exact_canonical_url'
 else:
  key=base['canonical_identity_key'];s=seed_id.get(key);l=ls_id.get(key);basis='exact_source_id'
 candidates=[]
 if l and l.get('active'):
  r=l['active'];dt=parse_dt(r.get('last_seen_at'));candidates.append(('listing_source_active',dt,{'listing_source_id':r.get('id'),'last_seen_at':r.get('last_seen_at'),'is_active':True,'source_name':r.get('source_name')}))
 if s and s.get('fresh'):
  r=s['fresh'];dt=parse_dt(r.get('fresh_last_seen_at'));candidates.append(('seed_fresh_confirmed',dt,{'seed_id':r.get('id'),'fresh_last_seen_at':r.get('fresh_last_seen_at'),'freshness_status':r.get('freshness_status'),'seed_provider':r.get('seed_provider'),'fresh_channels':r.get('fresh_channels')}))
 verified=max(candidates,key=lambda x:x[1]) if candidates else None
 observed=[]
 if l and l.get('observed'):
  r=l['observed'];observed.append(('listing_source_seen',parse_dt(r.get('last_seen_at')),{'listing_source_id':r.get('id'),'last_seen_at':r.get('last_seen_at'),'is_active':r.get('is_active'),'source_name':r.get('source_name')}))
 if s and s.get('observed'):
  r=s['observed'];observed.append(('seed_observed',parse_dt(r.get('last_observed_at')),{'seed_id':r.get('id'),'last_observed_at':r.get('last_observed_at'),'freshness_status':r.get('freshness_status'),'seed_provider':r.get('seed_provider'),'observation_count':r.get('observation_count')}))
 latest_obs=max(observed,key=lambda x:x[1]) if observed else None
 if verified:
  age=age_days(now,verified[1]);bucket=age_bucket('verified',age);state='verified'
 elif latest_obs:
  age=age_days(now,latest_obs[1]);bucket=age_bucket('observed_only',age);state='observed_only'
 elif s and s.get('stale'):
  age=None;bucket='stale_exact';state='stale'
 else:
  age=None;bucket='none';state='none'
 return {'match_basis':basis if s or l else None,'identity_key':key,'state':state,'bucket':bucket,'age_days':round(age,3) if age is not None else None,'verified_channel':verified[0] if verified else None,'verified_at':verified[1].isoformat().replace('+00:00','Z') if verified else None,'verified_evidence':verified[2] if verified else None,'latest_observation_channel':latest_obs[0] if latest_obs else None,'latest_observed_at':latest_obs[1].isoformat().replace('+00:00','Z') if latest_obs else None,'latest_observation_evidence':latest_obs[2] if latest_obs else None,'explicit_stale':bool(s and s.get('stale')),'fresh_status_without_timestamp':bool(s and s.get('undated_fresh')),'seed_rows':s.get('rows',0) if s else 0,'listing_source_rows':l.get('rows',0) if l else 0,'freshness_inherited_from_cluster':False}

meta=json.loads((DB/'summary.json').read_text(encoding='utf-8'));now=parse_dt(meta['generatedAt']) or datetime.now(timezone.utc)
seeds=list(load_jsonl(DB/'source-offer-seeds.jsonl'));ls=list(load_jsonl(DB/'listing-sources.jsonl'));maps=make_maps(seeds,ls)
assignment={}
with open(Q2C/'representation-clusters-qa.tsv',encoding='utf-8') as f:
 head=f.readline().rstrip('\n').split('\t');assert head==['row_index','property_cluster_id','cluster_size','confidence','qa_status']
 for line in f:
  i,cid,size,conf,q=line.rstrip('\n').split('\t');assignment[int(i)]={'property_cluster_id':cid,'cluster_size':int(size),'cluster_confidence':conf,'cluster_qa_status':q}
assert len(assignment)==EXPECTED_ROWS
OUT.mkdir(parents=True,exist_ok=True)
counts=Counter();domains=defaultdict(Counter);cluster_members=defaultdict(list);matched=0;h=hashlib.sha256()
with open(Q1D/'manifest-q1d.jsonl',encoding='utf-8') as inp,open(OUT/'freshness-evidence.jsonl','w',encoding='utf-8') as out:
 for i,line in enumerate(inp):
  if not line.strip():continue
  base=json.loads(line);ev=evidence_for(base,now,maps);a=assignment[i]
  row={'row_index':i,'representation_key':base['representation_key'],'normalized_source_domain':base['normalized_source_domain'],'property_cluster_id':a['property_cluster_id'],'cluster_size':a['cluster_size'],'evidence':ev}
  txt=json.dumps(row,separators=(',',':'),ensure_ascii=False)+'\n';out.write(txt);h.update(txt.encode())
  counts[ev['bucket']]+=1;counts['state_'+ev['state']]+=1;domains[base['normalized_source_domain']][ev['bucket']]+=1;domains[base['normalized_source_domain']]['rows']+=1
  if ev['match_basis']:matched+=1
  cluster_members[a['property_cluster_id']].append({'row_index':i,'representation_key':base['representation_key'],'source_domain':base['normalized_source_domain'],'bucket':ev['bucket'],'state':ev['state'],'verified_at':ev['verified_at'],'verified_channel':ev['verified_channel']})
assert sum(v['rows'] for v in domains.values())==EXPECTED_ROWS and len(cluster_members)==EXPECTED_CLUSTERS
rank={'verified_7d':0,'verified_30d':1,'verified_90d':2,'verified_older':3,'observed_only_7d':4,'observed_only_30d':5,'observed_only_90d':6,'observed_only_older':7,'stale_exact':8,'none':9,'verified_undated':10,'observed_only_undated':11}
cluster_counts=Counter();ch=hashlib.sha256()
with open(OUT/'cluster-freshness.jsonl','w',encoding='utf-8') as f:
 for cid,members in sorted(cluster_members.items()):
  best=min(members,key=lambda x:(rank.get(x['bucket'],99),x['row_index']));bucket='cluster_best_'+best['bucket'];cluster_counts[bucket]+=1
  row={'property_cluster_id':cid,'member_count':len(members),'best_member_bucket':best['bucket'],'best_member_row_index':best['row_index'],'best_member_representation_key':best['representation_key'],'best_member_source_domain':best['source_domain'],'best_member_verified_at':best['verified_at'],'best_member_verified_channel':best['verified_channel'],'member_evidence_inherited':False}
  txt=json.dumps(row,separators=(',',':'),ensure_ascii=False)+'\n';f.write(txt);ch.update(txt.encode())
with open(OUT/'coverage-by-domain.json','w',encoding='utf-8') as f:json.dump({k:dict(v) for k,v in sorted(domains.items())},f,indent=2,ensure_ascii=False)
amb=maps[4]
summary={'schemaVersion':'q3a-freshness-evidence-v1','generatedAt':now.isoformat().replace('+00:00','Z'),'inputRepresentations':EXPECTED_ROWS,'outputRepresentations':EXPECTED_ROWS,'qaClusters':EXPECTED_CLUSTERS,'exactMatchedRepresentations':matched,'unmatchedRepresentations':EXPECTED_ROWS-matched,'representationBucketCounts':dict(counts),'clusterBestBucketCounts':dict(cluster_counts),'sourceOfferSeedRows':len(seeds),'listingSourceRows':len(ls),**amb,'artifactOrCohortTimestampUsedAsFreshness':False,'commonCrawlObservationAloneCountsAsFresh':False,'clusterEvidenceInheritedToMembers':False,'freshnessInferred':False,'authorizationInferred':False,'databaseWrites':0,'productionWrites':0,'sourceSiteFetches':0,'vercelDeployments':0,'freshnessEvidenceSha256':h.hexdigest(),'clusterFreshnessSha256':ch.hexdigest(),'failures':[]}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');print(json.dumps(summary,indent=2,ensure_ascii=False))
