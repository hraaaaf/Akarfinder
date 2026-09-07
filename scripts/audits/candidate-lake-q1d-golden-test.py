#!/usr/bin/env python3
import json, re, unicodedata
from pathlib import Path

def norm_text(v):
    if v is None: return None
    s=unicodedata.normalize('NFKD',str(v)).encode('ascii','ignore').decode('ascii').lower()
    s=re.sub(r'[^a-z0-9]+',' ',s).strip()
    return s or None

g=json.loads(Path(__file__).with_name('candidate-lake-q1d-normalization-golden.json').read_text())
for c in g['cases']:
    got=norm_text(c['input'])
    assert got==c['expected'], (c,got)
print(json.dumps({'cases':len(g['cases']),'status':'pass'}))
