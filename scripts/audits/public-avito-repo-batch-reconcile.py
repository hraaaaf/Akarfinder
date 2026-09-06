#!/usr/bin/env python3
import hashlib, json, os, re
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(os.environ.get('AVITO_BATCH_ROOT','.tmp/public-avito-repos'))
OUT=Path(os.environ.get('AVITO_BATCH_OUT','.tmp/public-avito-repo-batch'))
BASELINE_FILES=[
    Path(os.environ.get('AVITO_BASELINE_IDS','.tmp/avito-baseline/union_ids.txt')),
    Path(os.environ.get('AVITO_HICHAM_NET_IDS','.tmp/hicham-baseline/avito-net-new-ids.txt')),
]
REPOS=[
    ('achrafdigital/Simplon-Python-Challenges','achrafdigital'),
    ('Ilhamelgharbi/pfma','pfma'),
    ('Ilhamelgharbi/Real-Estate-Price-Estimation-Project','ilham-price'),
    ('ABDELOUAHEDTEX/Rabat_Immobilier_Prediction','rabat'),
]
TEXT_EXT={'.csv','.json','.txt','.md','.py','.ipynb','.ts','.js','.html','.xml','.yml','.yaml'}
URL_RE=re.compile(r'https?://(?:www\.)?avito\.ma/[^\s\"\'<>]*?(\d{6,})\.htm(?:$|[?#\\\"\'\s,\]])',re.I)

def read_ids(p):
    if not p.exists(): raise SystemExit(f'missing baseline {p}')
    return {x.strip() for x in p.read_text(encoding='utf-8',errors='ignore').splitlines() if x.strip().isdigit()}

def sha256_file(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def scan_repo(d):
    found={}; files=[]; scanned=0
    for p in d.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXT: continue
        scanned+=1
        text=p.read_text(encoding='utf-8',errors='ignore').replace('\\/','/')
        ids={m.group(1) for m in URL_RE.finditer(text)}
        if ids:
            rel=str(p.relative_to(d))
            for i in ids: found.setdefault(i,rel)
            files.append({'file':rel,'distinctIds':len(ids),'sha256':sha256_file(p)})
    return set(found),scanned,sorted(files,key=lambda x:(-x['distinctIds'],x['file']))

def main():
    baseline=set(); parts=[]
    for p in BASELINE_FILES:
        ids=read_ids(p); baseline|=ids; parts.append({'file':str(p),'ids':len(ids)})
    if len(baseline)!=42120: raise SystemExit(f'unexpected Avito baseline union {len(baseline)}')
    running=set(baseline); combined=set(); rows=[]
    OUT.mkdir(parents=True,exist_ok=True)
    for repo,slug in REPOS:
        d=ROOT/slug
        if not d.exists(): raise SystemExit(f'missing repo dir {d}')
        found,scanned,files=scan_repo(d)
        overlap=found & running; net=found-running
        running|=found; combined|=net
        (OUT/f'{slug}-net-new-ids.txt').write_text('\n'.join(sorted(net,key=int))+('\n' if net else ''),encoding='utf-8')
        rows.append({'repo':repo,'slug':slug,'textFilesScanned':scanned,'filesWithIds':len(files),'files':files,'foundDistinctIds':len(found),'overlapVsRunningUnion':len(overlap),'exactNetNewSequential':len(net),'runningUnionAfter':len(running)})
    (OUT/'combined-net-new-ids.txt').write_text('\n'.join(sorted(combined,key=int))+('\n' if combined else ''),encoding='utf-8')
    summary={'generatedAt':datetime.now(timezone.utc).isoformat(),'unit':'AVITO_LISTING_ID','baselineParts':parts,'baselineUnionIds':len(baseline),'repos':rows,'combinedExactNetNewSequential':len(combined),'finalAvitoUnionIds':len(running),'databaseWrites':0,'sourceSiteFetches':0,'publicGithubRepoFetches':len(REPOS),'githubArtifactFetches':2,'readOnly':True}
    (OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps(summary,indent=2,ensure_ascii=False))

if __name__=='__main__': main()
