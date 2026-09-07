#!/usr/bin/env python3
import json, os
from pathlib import Path
ROOT=Path(os.getenv('Q2A_OUT','.tmp/q2a-blocking'))
s=json.loads((ROOT/'summary.json').read_text())
assert s['inputRows']==251046
assert s['candidatePairs']>0
assert s['candidatePairs']<s['unorderedAllPairsBaseline']
assert s['crossSourcePairs']>0
assert s['reductionFraction']>0.99
assert s['databaseWrites']==0 and s['productionWrites']==0 and s['sourceSiteFetches']==0 and s['vercelDeployments']==0
assert s['missingDataInvented'] is False and s['freshnessInferred'] is False and s['authorizationInferred'] is False and s['physicalPropertyMergePerformed'] is False
count=0; seen=set()
with open(ROOT/'candidate-pairs.tsv',encoding='utf-8') as f:
 header=f.readline().rstrip('\n'); assert header=='a\tb\tmask'
 for line in f:
  a,b,m=map(int,line.rstrip('\n').split('\t')); assert 0<=a<b<251046; assert m>0
  key=(a,b); assert key not in seen; seen.add(key); count+=1
assert count==s['candidatePairs'],(count,s['candidatePairs'])
print(json.dumps({'candidatePairs':count,'crossSourcePairs':s['crossSourcePairs'],'reductionFraction':s['reductionFraction'],'pairsSha256':s['candidatePairsSha256']},indent=2))
