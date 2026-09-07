#!/usr/bin/env python3
import hashlib,json,os
from collections import Counter,defaultdict
from pathlib import Path

Q1D=Path(os.getenv('Q3B_Q1D_ROOT','.tmp/q3b-input/q1d'))
Q2C=Path(os.getenv('Q3B_Q2C_ROOT','.tmp/q3b-input/q2c'))
Q3A=Path(os.getenv('Q3B_Q3A_ROOT','.tmp/q3b-input/q3a'))
OUT=Path(os.getenv('Q3B_OUT','.tmp/q3b-live-confidence'))
EXPECTED_ROWS=251_046
EXPECTED_CLUSTERS=250_774

VERIFIED_RECENT={'verified_7d','verified_30d'}
VERIFIED_ANY={'verified_7d','verified_30d','verified_90d'}
RECENT_OBS={'observed_only_7d','observed_only_30d'}


def load_jsonl(p):
 with open(p,encoding='utf-8') as f:
  for line in f:
   if line.strip():yield json.loads(line)

def feature_bonus(f):
 keys=('city','district','property_type','transaction_type','price_mad','surface_m2','bedrooms_count','title')
 present=[k for k in keys if f.get(k) is not None]
 return min(8,len(present)),present

def evidence_base(ev):
 b=ev['bucket'];ch=ev.get('verified_channel')
 listing=(ch=='listing_source_active')
 if b=='verified_7d':return (82 if listing else 76),['exact_verified_le_7d',ch or 'verified']
 if b=='verified_30d':return (68 if listing else 62),['exact_verified_8_30d',ch or 'verified']
 if b=='verified_90d':return (48 if listing else 44),['exact_verified_31_90d',ch or 'verified']
 if b=='verified_older':return (25 if listing else 22),['exact_verified_gt_90d_too_old_for_live_tier',ch or 'verified']
 if b=='observed_only_7d':return 22,['observed_only_le_7d_not_activity_proof']
 if b=='observed_only_30d':return 16,['observed_only_8_30d_not_activity_proof']
 if b=='observed_only_90d':return 10,['observed_only_31_90d_not_activity_proof']
 if b=='observed_only_older':return 5,['observed_only_gt_90d_not_activity_proof']
 if b=='stale_exact':return 0,['explicit_stale']
 return 0,['no_exact_freshness_evidence']

def cluster_bonus(members):
 domains_verified7={m['domain'] for m in members if m['bucket']=='verified_7d'}
 domains_verified30={m['domain'] for m in members if m['bucket'] in VERIFIED_RECENT}
 if len(domains_verified7)>=2:return 10,'cross_source_verified_le_7d'
 if len(domains_verified30)>=2:return 7,'cross_source_verified_le_30d'
 verified30={m['domain'] for m in members if m['bucket'] in VERIFIED_RECENT}
 observed30={m['domain'] for m in members if m['bucket'] in RECENT_OBS}
 if verified30 and any(d not in verified30 for d in observed30):return 4,'verified_plus_recent_observed_cross_source'
 verified90={m['domain'] for m in members if m['bucket'] in VERIFIED_ANY}
 any_evidence={m['domain'] for m in members if m['bucket']!='none'}
 if verified90 and any(d not in verified90 for d in any_evidence):return 2,'verified_plus_other_cross_source_evidence'
 return 0,None

def tier_for(ev,score):
 b=ev['bucket']
 # Hard anti-reactivation rule: no observed-only, stale, absent, or >90d evidence can yield a live tier.
 if b not in VERIFIED_ANY:return 'none'
 if b=='verified_7d' and score>=80:return 'high'
 if b in VERIFIED_RECENT and score>=62:return 'medium'
 if score>=44:return 'low'
 return 'none'

# Load Q1D features in frozen row order.
features=[]
for r in load_jsonl(Q1D/'manifest-q1d.jsonl'):
 features.append(r['features'])
assert len(features)==EXPECTED_ROWS

assign={}
with open(Q2C/'representation-clusters-qa.tsv',encoding='utf-8') as f:
 head=f.readline().rstrip('\n').split('\t');assert head==['row_index','property_cluster_id','cluster_size','confidence','qa_status']
 for line in f:
  i,cid,size,conf,qa=line.rstrip('\n').split('\t');assign[int(i)]={'cluster_id':cid,'cluster_size':int(size),'cluster_confidence':conf,'qa_status':qa}
assert len(assign)==EXPECTED_ROWS

fresh=list(load_jsonl(Q3A/'freshness-evidence.jsonl'));assert len(fresh)==EXPECTED_ROWS
for i,r in enumerate(fresh):assert r['row_index']==i
cluster_members=defaultdict(list)
for r in fresh:
 ev=r['evidence'];cluster_members[r['property_cluster_id']].append({'row_index':r['row_index'],'domain':r['normalized_source_domain'],'bucket':ev['bucket'],'state':ev['state']})
assert len(cluster_members)==EXPECTED_CLUSTERS
cluster_bonus_map={cid:cluster_bonus(ms) for cid,ms in cluster_members.items()}

OUT.mkdir(parents=True,exist_ok=True)
tier_counts=Counter();source_tiers=defaultdict(Counter);score_bands=Counter();anti=Counter();h=hashlib.sha256();rep_rows=[]
for r in fresh:
 i=r['row_index'];ev=r['evidence'];base,reasons=evidence_base(ev);fb,present=feature_bonus(features[i]);a=assign[i];cb,cb_reason=cluster_bonus_map[a['cluster_id']]
 qa_bonus=2 if a['cluster_size']>1 and a['cluster_confidence']=='high' else 0
 score=min(100,base+fb+cb+qa_bonus)
 tier=tier_for(ev,score)
 reasons=list(reasons)
 if fb:reasons.append(f'content_completeness_bonus_{fb}')
 if cb_reason:reasons.append(cb_reason)
 if qa_bonus:reasons.append('q2b_high_confidence_cluster_bonus_2')
 if ev['state']=='observed_only' and tier!='none':anti['observedOnlyLiveTierViolation']+=1
 if ev['state']=='none' and tier!='none':anti['noEvidenceLiveTierViolation']+=1
 if ev['bucket']=='verified_older' and tier!='none':anti['olderThan90dLiveTierViolation']+=1
 row={'row_index':i,'representation_key':r['representation_key'],'source_domain':r['normalized_source_domain'],'property_cluster_id':a['cluster_id'],'cluster_size':a['cluster_size'],'freshness_bucket':ev['bucket'],'verified_channel':ev.get('verified_channel'),'verified_at':ev.get('verified_at'),'feature_count':features[i].get('feature_count',0),'quality_fields_present':present,'live_confidence_score':score,'live_confidence_tier':tier,'reasons':reasons,'active_inferred':False,'authorization_inferred':False,'cluster_tier_inherited':False}
 rep_rows.append(row);tier_counts[tier]+=1;source_tiers[row['source_domain']][tier]+=1;score_bands[f'{(score//10)*10:02d}-{min(99,(score//10)*10+9):02d}']+=1
 txt=json.dumps(row,separators=(',',':'),ensure_ascii=False)+'\n';h.update(txt.encode())
with open(OUT/'representation-live-confidence.jsonl','w',encoding='utf-8') as f:
 for row in rep_rows:f.write(json.dumps(row,separators=(',',':'),ensure_ascii=False)+'\n')

order={'high':0,'medium':1,'low':2,'none':3};cluster_counts=Counter();ch=hashlib.sha256();cluster_rows=[]
by_cluster=defaultdict(list)
for row in rep_rows:by_cluster[row['property_cluster_id']].append(row)
for cid,ms in sorted(by_cluster.items()):
 best=min(ms,key=lambda x:(order[x['live_confidence_tier']],-x['live_confidence_score'],x['row_index']))
 verified_members=[x for x in ms if x['live_confidence_tier']!='none']
 row={'property_cluster_id':cid,'member_count':len(ms),'cluster_live_confidence_tier':best['live_confidence_tier'],'cluster_live_confidence_score':best['live_confidence_score'],'best_member_row_index':best['row_index'],'best_member_representation_key':best['representation_key'],'best_member_source_domain':best['source_domain'],'verified_live_member_count':len(verified_members),'representation_tiers_inherited':False,'authorization_inferred':False,'active_inferred':False}
 cluster_rows.append(row);cluster_counts[row['cluster_live_confidence_tier']]+=1
 txt=json.dumps(row,separators=(',',':'),ensure_ascii=False)+'\n';ch.update(txt.encode())
with open(OUT/'cluster-live-confidence.jsonl','w',encoding='utf-8') as f:
 for row in cluster_rows:f.write(json.dumps(row,separators=(',',':'),ensure_ascii=False)+'\n')
with open(OUT/'distribution-by-source.json','w',encoding='utf-8') as f:json.dump({k:dict(v) for k,v in sorted(source_tiers.items())},f,indent=2,ensure_ascii=False)
# Deterministic edge cases for QA: strongest none-tier rows + weakest high-tier rows.
none_cases=sorted((r for r in rep_rows if r['live_confidence_tier']=='none'),key=lambda x:(-x['live_confidence_score'],x['row_index']))[:50]
high_cases=sorted((r for r in rep_rows if r['live_confidence_tier']=='high'),key=lambda x:(x['live_confidence_score'],x['row_index']))[:50]
with open(OUT/'edge-cases.jsonl','w',encoding='utf-8') as f:
 for r in none_cases+high_cases:f.write(json.dumps(r,separators=(',',':'),ensure_ascii=False)+'\n')
summary={'schemaVersion':'q3b-live-confidence-v1','inputRepresentations':EXPECTED_ROWS,'inputClusters':EXPECTED_CLUSTERS,'representationTierCounts':dict(tier_counts),'clusterTierCounts':dict(cluster_counts),'scoreBandCounts':dict(score_bands),'antiReactivationViolations':dict(anti),'observedOnlyCanProduceLiveTier':False,'noEvidenceCanProduceLiveTier':False,'olderThan90dCanProduceLiveTier':False,'historicalArtifactTimestampCanProduceLiveTier':False,'clusterTierPromotesMemberRepresentations':False,'activeInferred':False,'authorizationInferred':False,'databaseWrites':0,'productionWrites':0,'sourceSiteFetches':0,'vercelDeployments':0,'representationSha256':h.hexdigest(),'clusterSha256':ch.hexdigest(),'failures':[]}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');print(json.dumps(summary,indent=2,ensure_ascii=False))
