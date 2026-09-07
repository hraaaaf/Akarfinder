#!/usr/bin/env python3
import json, os
from pathlib import Path
p=Path(os.getenv('Q1D_OUT','.tmp/q1d-features'))/'summary.json'
s=json.loads(p.read_text())
required=['city','district','property_type','transaction_type','price_mad','surface_m2','rooms_count','bedrooms_count','bathrooms_count','latitude','longitude','title']
for k in required:
    assert k in s['coverageCounts'] or k in ('district','rooms_count','bedrooms_count','bathrooms_count','latitude','longitude'), k
assert s['matchedRows'] + s['unmatchedRows'] == s['outputRows']
assert s['fingerprintRows'] <= s['matchedRows']
print(json.dumps({'matchedRows':s['matchedRows'],'fingerprintRows':s['fingerprintRows'],'coverageCounts':s['coverageCounts']},indent=2))
