#!/usr/bin/env python3
import json,os
from pathlib import Path
ROOT=Path(os.getenv('Q3A_OUT','.tmp/q3a-freshness'))
s=json.loads((ROOT/'summary.json').read_text(encoding='utf-8'))
assert s['inputRepresentations']==251046
assert s['outputRepresentations']==251046
assert s['qaClusters']==250774
assert s['exactMatchedRepresentations']+s['unmatchedRepresentations']==251046
assert sum(v for k,v in s['representationBucketCounts'].items() if not k.startswith('state_'))==251046
assert sum(s['clusterBestBucketCounts'].values())==250774
assert s['artifactOrCohortTimestampUsedAsFreshness'] is False
assert s['commonCrawlObservationAloneCountsAsFresh'] is False
assert s['clusterEvidenceInheritedToMembers'] is False
assert s['freshnessInferred'] is False
assert s['authorizationInferred'] is False
assert s['databaseWrites']==s['productionWrites']==s['sourceSiteFetches']==s['vercelDeployments']==0
assert not s['failures']
print(json.dumps({'ok':True,'exactMatchedRepresentations':s['exactMatchedRepresentations'],'verified7d':s['representationBucketCounts'].get('verified_7d',0),'verified30d':s['representationBucketCounts'].get('verified_30d',0),'clustersBestVerified7d':s['clusterBestBucketCounts'].get('cluster_best_verified_7d',0)}))
