#!/usr/bin/env python3
import json,os
from pathlib import Path
ROOT=Path(os.getenv('Q2C_OUT','.tmp/q2c-qa'))
s=json.loads((ROOT/'summary.json').read_text(encoding='utf-8'))
assert s['inputRepresentations']==251046
assert s['inputProbableUnique']==250774
assert s['multiClustersAudited']==271
assert s['rowsAudited']==543
assert s['allMultiClustersExhaustivelyAudited'] is True
assert s['qaAdjustedProbableUnique']>=250774
assert s['qaAdjustedProbableUnique']<=251046
assert s['bathroomFieldUsedAsHardGate'] is False
assert s['physicalMergeDestructive'] is False
assert s['missingDataInvented'] is False
assert s['freshnessInferred'] is False
assert s['authorizationInferred'] is False
assert s['databaseWrites']==s['productionWrites']==s['sourceSiteFetches']==s['vercelDeployments']==0
assert not s['failures']
qa=[json.loads(x) for x in (ROOT/'cluster-qa.jsonl').read_text(encoding='utf-8').splitlines() if x.strip()]
assert len(qa)==271
assert all(q['status'] in {'accepted_clean','accepted_with_risk_flags','break_to_singletons'} for q in qa)
print(json.dumps({'ok':True,'multiClustersAudited':271,'hardBreakClusters':s['hardBreakClusters'],'qaAdjustedProbableUnique':s['qaAdjustedProbableUnique']}))
