#!/usr/bin/env python3
from pathlib import Path
import json, os

root=Path(os.getenv('Q1D_OUT','.tmp/q1d-features'))
summary=json.loads((root/'summary.json').read_text())
assert summary['inputRows']==251046
assert summary['outputRows']==251046
assert summary['missingDataInvented'] is False
assert summary['freshnessInferred'] is False
assert summary['authorizationInferred'] is False
assert summary['physicalPropertyMergePerformed'] is False
assert summary['databaseWrites']==0
assert summary['productionWrites']==0
assert summary['sourceSiteFetches']==0
assert summary['vercelDeployments']==0
assert summary['fingerprintRows'] <= 251046
print(json.dumps(summary,indent=2))
