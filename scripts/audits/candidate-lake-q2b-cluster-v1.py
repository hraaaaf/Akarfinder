#!/usr/bin/env python3
import hashlib,json,os
from collections import Counter,defaultdict
from pathlib import Path

Q1D=Path(os.getenv('Q2B_Q1D_ROOT','.tmp/q2b-input/q1d'))
Q2A=Path(os.getenv('Q2B_Q2A_ROOT','.tmp/q2b-input/q2a'))
OUT=Path(os.getenv('Q2B_OUT','.tmp/q2b-clusters'))
EXPECTED=251_046
MAX_CLUSTER=8

def load_jsonl(path):
 with open(path,encoding='utf-8') as f:
  for line in f:
   if line.strip():yield json.loads(line)

def rel(a,b):
 if a is None or b is None:return None
 a=float(a);b=float(b);return abs(a-b)/max(abs(a),abs(b),1.0)
def tj(a,b):
 a=set(a or []);b=set(b or [])
 if not a or not b:return None
 return len(a&b)/len(a|b)
def eq_known(a,b,k):return a.get(k) is not None and a.get(k)==b.get(k)
def trans_ok(a,b):return a.get('transaction_type') is None or b.get('transaction_type') is None or a.get('transaction_type')==b.get('transaction_type')

def pair_eval(a,b):
 # hard contradictions: V1 prefers false splits over false merges.
 for k in ('city','district','property_type','transaction_type'):
  if a.get(k) is not None and b.get(k) is not None and a.get(k)!=b.get(k):return None,'categorical_conflict'
 pd=rel(a.get('price_mad'),b.get('price_mad')); sd=rel(a.get('surface_m2'),b.get('surface_m2'))
 if pd is not None and pd>.20:return None,'price_conflict'
 if sd is not None and sd>.15:return None,'surface_conflict'
 if a.get('bedrooms_count') is not None and b.get('bedrooms_count') is not None and a.get('bedrooms_count')!=b.get('bedrooms_count'):return None,'bedrooms_conflict'
 title=tj(a.get('title_tokens'),b.get('title_tokens'));score=0;groups=0
 if eq_known(a,b,'city'):score+=10;groups+=1
 if eq_known(a,b,'district'):score+=18;groups+=1
 if eq_known(a,b,'property_type'):score+=12;groups+=1
 if eq_known(a,b,'transaction_type'):score+=10;groups+=1
 if pd is not None:
  if pd<=.02:score+=20;groups+=1
  elif pd<=.05:score+=17;groups+=1
  elif pd<=.08:score+=13;groups+=1
  elif pd<=.12:score+=8;groups+=1
 if sd is not None:
  if sd<=.02:score+=20;groups+=1
  elif sd<=.05:score+=17;groups+=1
  elif sd<=.08:score+=13;groups+=1
  elif sd<=.12:score+=8;groups+=1
 if eq_known(a,b,'bedrooms_count'):score+=8;groups+=1
 if title is not None:
  if title>=.85:score+=22;groups+=1
  elif title>=.70:score+=18;groups+=1
  elif title>=.55:score+=13;groups+=1
  elif title>=.40:score+=8;groups+=1
 geo=False
 if None not in (a.get('latitude'),a.get('longitude'),b.get('latitude'),b.get('longitude')):
  geo=round(float(a['latitude']),5)==round(float(b['latitude']),5) and round(float(a['longitude']),5)==round(float(b['longitude']),5)
  if geo:score+=18;groups+=1
 structural=(eq_known(a,b,'city') and eq_known(a,b,'property_type') and eq_known(a,b,'district') and trans_ok(a,b) and pd is not None and sd is not None and pd<=.05 and sd<=.05 and eq_known(a,b,'bedrooms_count'))
 title_supported=(eq_known(a,b,'city') and eq_known(a,b,'property_type') and trans_ok(a,b) and title is not None and title>=.70 and ((pd is not None and pd<=.10) or (sd is not None and sd<=.10)) and score>=70)
 geo_supported=(geo and eq_known(a,b,'city') and eq_known(a,b,'property_type') and trans_ok(a,b) and ((pd is not None and pd<=.10) or (sd is not None and sd<=.10) or (title is not None and title>=.60)) and score>=65)
 reasons=[]
 if structural:reasons.append('tight_structured_cross_source')
 if title_supported:reasons.append('title_supported_cross_source')
 if geo_supported:reasons.append('geo_supported_cross_source')
 return {'score':score,'groups':groups,'price_diff':pd,'surface_diff':sd,'title_jaccard':title,'geo_exact_5dp':geo,'reasons':reasons},None

rows=list(load_jsonl(Q1D/'manifest-q1d.jsonl'));assert len(rows)==EXPECTED
idx=[]
for r in load_jsonl(Q2A/'representation-index.jsonl'):idx.append(r)
assert len(idx)==EXPECTED
for i,(a,b) in enumerate(zip(rows,idx)):
 assert b['row_index']==i and b['representation_key']==a['representation_key'],'Q2A/Q1D row-index drift'
features=[r['features'] for r in rows];domains=[r['normalized_source_domain'] for r in rows]

accepted=[];eval_counts=Counter();reason_counts=Counter()
with open(Q2A/'candidate-pairs.tsv',encoding='utf-8') as f:
 assert f.readline().rstrip('\n')=='a\tb\tmask'
 for line in f:
  i,j,mask=map(int,line.rstrip('\n').split('\t'))
  if domains[i]==domains[j]:eval_counts['same_source_not_clustered']+=1;continue
  ev,why=pair_eval(features[i],features[j])
  if ev is None:eval_counts['hard_reject_'+why]+=1;continue
  if not ev['reasons']:eval_counts['cross_source_below_v1_gate']+=1;continue
  accepted.append((ev['score'],i,j,mask,ev));eval_counts['accepted_cross_source_edge']+=1
  for x in ev['reasons']:reason_counts[x]+=1

parent=list(range(EXPECTED));members={i:[i] for i in range(EXPECTED)};merge_edges=[];cluster_reject=Counter()
def find(x):
 while parent[x]!=x:
  parent[x]=parent[parent[x]];x=parent[x]
 return x
def compatible(A,B):
 inds=members[A]+members[B]
 if len(inds)>MAX_CLUSTER:return False,'max_cluster_size'
 ds=[domains[i] for i in inds]
 if len(ds)!=len(set(ds)):return False,'source_repeat'
 for k in ('city','district','property_type','transaction_type'):
  vals={features[i].get(k) for i in inds if features[i].get(k) is not None}
  if len(vals)>1:return False,'cluster_'+k+'_conflict'
 ps=[float(features[i]['price_mad']) for i in inds if features[i].get('price_mad') is not None]
 if len(ps)>=2 and (max(ps)-min(ps))/max(ps)>.08:return False,'cluster_price_span'
 ss=[float(features[i]['surface_m2']) for i in inds if features[i].get('surface_m2') is not None]
 if len(ss)>=2 and (max(ss)-min(ss))/max(ss)>.06:return False,'cluster_surface_span'
 bs={features[i].get('bedrooms_count') for i in inds if features[i].get('bedrooms_count') is not None}
 if len(bs)>1:return False,'cluster_bedrooms_conflict'
 return True,None

for score,i,j,mask,ev in sorted(accepted,key=lambda x:(-x[0],x[1],x[2],x[3])):
 A=find(i);B=find(j)
 if A==B:continue
 ok,why=compatible(A,B)
 if not ok:cluster_reject[why]+=1;continue
 if len(members[A])<len(members[B]):A,B=B,A
 parent[B]=A;members[A].extend(members.pop(B));merge_edges.append({'a':i,'b':j,'score':score,'mask':mask,'reasons':ev['reasons'],'price_diff':ev['price_diff'],'surface_diff':ev['surface_diff'],'title_jaccard':ev['title_jaccard'],'geo_exact_5dp':ev['geo_exact_5dp']})

roots=[find(i) for i in range(EXPECTED)];cluster_members=defaultdict(list)
for i,r in enumerate(roots):cluster_members[r].append(i)
cluster_edges=defaultdict(list)
for e in merge_edges:cluster_edges[find(e['a'])].append(e)
cluster_id={}
for root,inds in cluster_members.items():
 material='\n'.join(sorted(rows[i]['representation_key'] for i in inds));cluster_id[root]='pcv1_'+hashlib.sha256(material.encode()).hexdigest()[:20]

OUT.mkdir(parents=True,exist_ok=True);assign_hash=hashlib.sha256();multi_hash=hashlib.sha256();sizes=Counter();confidence=Counter();multi=0;rows_multi=0
with open(OUT/'representation-clusters.tsv','w',encoding='utf-8') as f:
 header='row_index\tproperty_cluster_id\tcluster_size\tconfidence\n';f.write(header);assign_hash.update(header.encode())
 for i in range(EXPECTED):
  root=find(i);n=len(cluster_members[root]);scores=[e['score'] for e in cluster_edges[root]]
  band='singleton' if n==1 else ('high' if scores and min(scores)>=90 else 'conservative')
  line=f'{i}\t{cluster_id[root]}\t{n}\t{band}\n';f.write(line);assign_hash.update(line.encode());sizes[n]+=1;confidence[band]+=1
with open(OUT/'clusters.jsonl','w',encoding='utf-8') as f:
 for root,inds in sorted(cluster_members.items(),key=lambda kv:cluster_id[kv[0]]):
  if len(inds)==1:continue
  multi+=1;rows_multi+=len(inds);edges=cluster_edges[root];scores=[e['score'] for e in edges]
  obj={'property_cluster_id':cluster_id[root],'size':len(inds),'member_row_indexes':sorted(inds),'representation_keys':[rows[i]['representation_key'] for i in sorted(inds)],'source_domains':[domains[i] for i in sorted(inds)],'edge_count':len(edges),'min_edge_score':min(scores),'max_edge_score':max(scores),'avg_edge_score':sum(scores)/len(scores),'merge_edges':edges}
  line=json.dumps(obj,separators=(',',':'),ensure_ascii=False)+'\n';f.write(line);multi_hash.update(line.encode())
probable=len(cluster_members);reduction=EXPECTED-probable
summary={'schemaVersion':'q2b-conservative-clustering-v1','inputRepresentations':EXPECTED,'probableUniqueMaterializable':probable,'representationReduction':reduction,'singletonClusters':sum(1 for v in cluster_members.values() if len(v)==1),'multiMemberClusters':multi,'rowsInMultiMemberClusters':rows_multi,'maxClusterSize':max(len(v) for v in cluster_members.values()),'clusterSizeDistribution':{str(k):v for k,v in sorted(Counter(len(v) for v in cluster_members.values()).items())},'acceptedPairEdgesBeforeClusterConstraints':len(accepted),'mergeEdgesUsed':len(merge_edges),'pairEvaluationCounts':dict(eval_counts),'acceptReasonCounts':dict(reason_counts),'clusterConstraintRejectCounts':dict(cluster_reject),'confidenceRepresentationCounts':dict(confidence),'crossSourceOnly':True,'uniqueSourcePerCluster':True,'maxClusterSizeGuard':MAX_CLUSTER,'data49bAggregateOnly':2326,'data49bIncluded':False,'data49bProbableUniqueClaimed':False,'physicalMergeDestructive':False,'missingDataInvented':False,'freshnessInferred':False,'authorizationInferred':False,'databaseWrites':0,'productionWrites':0,'sourceSiteFetches':0,'vercelDeployments':0,'representationClustersSha256':assign_hash.hexdigest(),'multiClustersSha256':multi_hash.hexdigest(),'failures':[]}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');print(json.dumps(summary,indent=2,ensure_ascii=False))
