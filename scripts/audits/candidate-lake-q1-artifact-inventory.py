#!/usr/bin/env python3
import hashlib, json, os
from pathlib import Path

ROOT=Path(os.environ.get('Q1_ARTIFACT_ROOT','.tmp/q1-artifacts'))
OUT=Path(os.environ.get('Q1_INVENTORY_OUT','.tmp/q1-artifact-inventory'))
TEXT_EXT={'.txt','.csv','.json','.jsonl','.ndjson','.tsv'}

def sha256(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for c in iter(lambda:f.read(1024*1024),b''): h.update(c)
    return h.hexdigest()

def line_count(p):
    try:
        with p.open('rb') as f: return sum(1 for _ in f)
    except Exception: return None

def sample(p,n=3):
    try:
        out=[]
        with p.open('r',encoding='utf-8',errors='ignore') as f:
            for _ in range(n):
                x=f.readline()
                if not x: break
                out.append(x.rstrip()[:240])
        return out
    except Exception: return []

def main():
    rows=[]
    for d in sorted(x for x in ROOT.iterdir() if x.is_dir()):
        files=[]
        for p in sorted(x for x in d.rglob('*') if x.is_file()):
            rel=str(p.relative_to(d))
            rec={'path':rel,'bytes':p.stat().st_size,'sha256':sha256(p)}
            if p.suffix.lower() in TEXT_EXT:
                rec['lines']=line_count(p); rec['sample']=sample(p)
            files.append(rec)
        rows.append({'artifact':d.name,'fileCount':len(files),'files':files})
    OUT.mkdir(parents=True,exist_ok=True)
    summary={'artifactCount':len(rows),'artifacts':rows,'databaseWrites':0,'sourceSiteFetches':0,'productionWrites':0,'readOnly':True}
    (OUT/'inventory.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    for a in rows:
        print(f"ARTIFACT {a['artifact']} files={a['fileCount']}")
        for f in a['files']:
            print(f"  {f['path']} bytes={f['bytes']} lines={f.get('lines')} sample={f.get('sample',[])[:1]}")

if __name__=='__main__': main()
