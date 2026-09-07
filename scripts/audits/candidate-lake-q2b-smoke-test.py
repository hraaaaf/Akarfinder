#!/usr/bin/env python3
import json,os
from pathlib import Path
ROOT=Path(os.getenv('Q2B_OUT','.tmp/q2b-clusters'))
s=json.loads((ROOT/'summary.json').read_text())
assert s['inputRepresentations']==251046
assert 0<s['probableUniqueMaterializable']<=251046
assert s['representationReduction']==251046-s['probableUniqueMaterializable']
assert s['multiMemberClusters']>0 and s['maxClusterSize']<=8
assert s['crossSourceOnly'] is True and s['uniqueSourcePerCluster'] is True
assert s['data49bIncluded'] is False and s['data49bProbableUniqueClaimed'] is False
assert s['physicalMergeDestructive'] is False and s['missingDataInvented'] is False and s['freshnessInferred'] is False and s['authorizationInferred'] is False
assert s['databaseWrites']==0 and s['productionWrites']==0 and s['sourceSiteFetches']==0 and s['vercelDeployments']==0
count=0
with open(ROOT/'representation-clusters.tsv',encoding='utf-8') as f:
 assert f.readline().rstrip('\n')=='row_index\tproperty_cluster_id\tcluster_size\tconfidence'
 for line in f:
  i,cid,size,conf=line.rstrip('\n').split('\t');assert int(i)==count;assert cid.startswith('pcv1_');assert int(size)>=1;count+=1
assert count==251046
print(json.dumps({'probableUniqueMaterializable':s['probableUniqueMaterializable'],'representationReduction':s['representationReduction'],'multiMemberClusters':s['multiMemberClusters'],'maxClusterSize':s['maxClusterSize']},indent=2))
