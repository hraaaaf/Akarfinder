#!/usr/bin/env python3
import hashlib,json,math,os,re
from collections import Counter
from itertools import combinations
from pathlib import Path

Q1D=Path(os.getenv('Q2C_Q1D_ROOT','.tmp/q2c-input/q1d'))
Q2B=Path(os.getenv('Q2C_Q2B_ROOT','.tmp/q2c-input/q2b'))
OUT=Path(os.getenv('Q2C_OUT','.tmp/q2c-qa'))
EXPECTED=251_046
EXPECTED_MULTI=271
MAX_CLUSTER=8


def load_jsonl(path):
 with open(path,encoding='utf-8') as f:
  for line in f:
   if line.strip():yield json.loads(line)

def rel(a,b):
 if a is None or b is None:return None
 a=float(a);b=float(b);return abs(a-b)/max(abs(a),abs(b),1.0)
def title_j(a,b):
 a=set(a or []);b=set(b or [])
 if not a or not b:return None
 return len(a&b)/len(a|b)
def hav_m(a,b,c,d):
 R=6371000.0;p1,p2=math.radians(a),math.radians(c);dp=math.radians(c-a);dl=math.radians(d-b)
 x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
 return 2*R*math.asin(math.sqrt(x))

def title_surface_numbers(f):
 title=f.get('title') or ''
 out=[]
 for m in re.finditer(r'(?<!\d)(\d{2,5})(?:[.,]\d+)?\s*(?:m2|m²|m\^2)',title.lower()):
  try:out.append(float(m.group(1)))
  except:pass
 return out

clusters=list(load_jsonl(Q2B/'clusters.jsonl'));assert len(clusters)==EXPECTED_MULTI
needed={i for c in clusters for i in c['member_row_indexes']}
rows={}
with open(Q1D/'manifest-q1d.jsonl',encoding='utf-8') as f:
 for idx,line in enumerate(f):
  if idx in needed:rows[idx]=json.loads(line)
  if len(rows)==len(needed):break
assert len(rows)==len(needed)==543

qa=[];flags=Counter();hard_reason_counts=Counter();bath_evidence=Counter();pair_counts=Counter();hard_clusters=set()
for c in clusters:
 inds=c['member_row_indexes'];hard=[];risk=[];pair_audits=[]
 domains=[rows[i]['normalized_source_domain'] for i in inds]
 if len(domains)!=len(set(domains)):hard.append('duplicate_source_in_cluster')
 if len(inds)>MAX_CLUSTER:hard.append('max_cluster_exceeded')
 for ia,ib in combinations(inds,2):
  a=rows[ia]['features'];b=rows[ib]['features'];pf=[];ph=[]
  pair_counts['audited']+=1
  for k in ('city','district','property_type','transaction_type'):
   if a.get(k) is not None and b.get(k) is not None and a.get(k)!=b.get(k):ph.append('categorical_'+k+'_conflict')
  if a.get('bedrooms_count') is not None and b.get('bedrooms_count') is not None and a.get('bedrooms_count')!=b.get('bedrooms_count'):ph.append('bedrooms_conflict')
  pd=rel(a.get('price_mad'),b.get('price_mad'));sd=rel(a.get('surface_m2'),b.get('surface_m2'))
  if pd is not None and pd>.08:ph.append('price_span_gt_8pct')
  if sd is not None and sd>.06:ph.append('surface_span_gt_6pct')
  if a.get('rooms_count') is not None and b.get('rooms_count') is not None and abs(int(a['rooms_count'])-int(b['rooms_count']))>=2:ph.append('rooms_delta_ge_2')
  tj=title_j(a.get('title_tokens'),b.get('title_tokens'))
  if tj is not None:
   pair_counts['title_comparable']+=1
   if len(a.get('title_tokens') or [])>=4 and len(b.get('title_tokens') or [])>=4 and tj<.20:ph.append('title_jaccard_lt_020')
  geo=None
  if all(x is not None for x in (a.get('latitude'),a.get('longitude'),b.get('latitude'),b.get('longitude'))):
   geo=hav_m(float(a['latitude']),float(a['longitude']),float(b['latitude']),float(b['longitude']));pair_counts['geo_comparable']+=1
   if geo>750:ph.append('geo_distance_gt_750m')
  ba=a.get('bathrooms_count');bb=b.get('bathrooms_count')
  if ba is not None and bb is not None and ba!=bb:
   pair_counts['bathroom_conflict']+=1;pf.append('bathroom_count_conflict_nonblocking')
   ea=(a.get('feature_evidence') or {}).get('bathrooms_count') or 'unknown';eb=(b.get('feature_evidence') or {}).get('bathrooms_count') or 'unknown'
   bath_evidence[' | '.join(sorted((ea,eb)))]+=1
  for f in (a,b):
   surf=f.get('surface_m2')
   if surf is not None:
    nums=title_surface_numbers(f)
    if nums and all(rel(surf,x) is not None and rel(surf,x)>.20 for x in nums):pf.append('title_surface_number_mismatch_nonblocking')
  for x in ph:hard_reason_counts[x]+=1
  pair_audits.append({'a':ia,'b':ib,'hard_flags':sorted(set(ph)),'risk_flags':sorted(set(pf)),'price_rel_diff':pd,'surface_rel_diff':sd,'title_jaccard':tj,'geo_distance_m':geo})
  hard.extend(ph);risk.extend(pf)
 hard=sorted(set(hard));risk=sorted(set(risk))
 status='break_to_singletons' if hard else ('accepted_with_risk_flags' if risk else 'accepted_clean')
 if hard:hard_clusters.add(c['property_cluster_id'])
 for x in risk:flags[x]+=1
 qa.append({'property_cluster_id':c['property_cluster_id'],'size':c['size'],'status':status,'hard_break_reasons':hard,'risk_flags':risk,'min_edge_score':c['min_edge_score'],'avg_edge_score':c['avg_edge_score'],'member_row_indexes':inds,'representation_keys':c['representation_keys'],'source_domains':c['source_domains'],'pair_audits':pair_audits})

# Conservative adjustment: any hard-failed multi-cluster is fully split to singletons.
orig_assign={}
with open(Q2B/'representation-clusters.tsv',encoding='utf-8') as f:
 header=f.readline().strip().split('\t');assert header==['row_index','property_cluster_id','cluster_size','confidence']
 for line in f:
  i,cid,size,conf=line.rstrip('\n').split('\t');orig_assign[int(i)]=(cid,int(size),conf)
assert len(orig_assign)==EXPECTED
broken_members={i for q in qa if q['status']=='break_to_singletons' for i in q['member_row_indexes']}
OUT.mkdir(parents=True,exist_ok=True);h=hashlib.sha256();cluster_ids=set()
with open(OUT/'representation-clusters-qa.tsv','w',encoding='utf-8') as f:
 head='row_index\tproperty_cluster_id\tcluster_size\tconfidence\tqa_status\n';f.write(head);h.update(head.encode())
 for i in range(EXPECTED):
  cid,size,conf=orig_assign[i]
  if i in broken_members:
   cid='pcqa_'+hashlib.sha256(rows[i]['representation_key'].encode()).hexdigest()[:20];size=1;conf='singleton';status='broken_by_q2c'
  else:status='accepted_q2c' if size>1 else 'singleton'
  cluster_ids.add(cid);line=f'{i}\t{cid}\t{size}\t{conf}\t{status}\n';f.write(line);h.update(line.encode())

with open(OUT/'cluster-qa.jsonl','w',encoding='utf-8') as f:
 for q in sorted(qa,key=lambda x:x['property_cluster_id']):f.write(json.dumps(q,separators=(',',':'),ensure_ascii=False)+'\n')
# Deterministic stratified manual review surface: every non-clean first, then weakest clean clusters, capped at 60.
risky=sorted([q for q in qa if q['status']!='accepted_clean'],key=lambda x:(0 if x['hard_break_reasons'] else 1,x['min_edge_score'],x['property_cluster_id']))
clean=sorted([q for q in qa if q['status']=='accepted_clean'],key=lambda x:(x['min_edge_score'],x['property_cluster_id']))
sample=(risky[:40]+clean[:20])[:60]
with open(OUT/'manual-review-sample.jsonl','w',encoding='utf-8') as f:
 for q in sample:f.write(json.dumps(q,separators=(',',':'),ensure_ascii=False)+'\n')

status_counts=Counter(q['status'] for q in qa)
probable=len(cluster_ids);reduction=EXPECTED-probable
summary={'schemaVersion':'q2c-cluster-qa-v1','inputRepresentations':EXPECTED,'inputProbableUnique':250774,'multiClustersAudited':len(qa),'rowsAudited':len(needed),'pairwiseComparisonsAudited':pair_counts['audited'],'hardBreakClusters':len(hard_clusters),'hardBreakReasonCounts':dict(hard_reason_counts),'qaStatusCounts':dict(status_counts),'riskFlagClusterCounts':dict(flags),'bathroomConflictPairs':pair_counts['bathroom_conflict'],'bathroomConflictEvidencePairs':dict(bath_evidence),'bathroomFieldUsedAsHardGate':False,'titleComparablePairs':pair_counts['title_comparable'],'geoComparablePairs':pair_counts['geo_comparable'],'manualReviewSampleRows':len(sample),'qaAdjustedProbableUnique':probable,'qaAdjustedRepresentationReduction':reduction,'allMultiClustersExhaustivelyAudited':len(qa)==EXPECTED_MULTI,'physicalMergeDestructive':False,'missingDataInvented':False,'freshnessInferred':False,'authorizationInferred':False,'databaseWrites':0,'productionWrites':0,'sourceSiteFetches':0,'vercelDeployments':0,'qaAssignmentsSha256':h.hexdigest(),'failures':[]}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');print(json.dumps(summary,indent=2,ensure_ascii=False))
