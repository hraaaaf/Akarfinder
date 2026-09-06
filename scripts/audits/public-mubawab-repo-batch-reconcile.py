#!/usr/bin/env python3
import hashlib, json, os, re
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(os.environ.get('BATCH_ROOT', '.tmp/public-mubawab-repos'))
OUT = Path(os.environ.get('BATCH_OUT', '.tmp/public-mubawab-repo-batch'))
BASELINE_FILES = [
    Path(os.environ.get('MUB_BASELINE_IDS', '.tmp/mubawab-baseline/listing-ids.txt')),
    Path(os.environ.get('MUB_REB_NET_IDS', '.tmp/realestatebuddy-baseline/net-new-ids.txt')),
    Path(os.environ.get('MUB_HICHAM_NET_IDS', '.tmp/hicham-baseline/mubawab-net-new-ids.txt')),
    Path(os.environ.get('MUB_MARWANE_NET_IDS', '.tmp/marwane-baseline/net-new-ids.txt')),
]
REPOS = [
    ('BenTouhami-MR/ApartmentPricePredictionInMorocco', 'bentouhami'),
    ('hassanelq/Agadir-House-Prices-Prediction', 'hassanelq'),
    ('Loubaris/Data-Immo', 'loubaris'),
    ('karzalSlimane/datascrapperV2', 'karzal'),
]
TEXT_EXT={'.csv','.json','.txt','.md','.py','.ipynb','.ts','.js','.html','.xml','.yml','.yaml'}
URL_RE=re.compile(r'https?://(?:www\.)?mubawab\.ma/[^\s\"\'<>]*?/(?:a|pa)/(\d+)(?:/|$|[?#])', re.I)

def read_ids(p):
    if not p.exists(): raise SystemExit(f'missing baseline file {p}')
    return {x.strip() for x in p.read_text(encoding='utf-8',errors='ignore').splitlines() if x.strip().isdigit()}

def sha256_file(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()

def scan_repo(repo_dir):
    found={}; files=[]; scanned=0
    for p in repo_dir.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXT: continue
        scanned += 1
        text=p.read_text(encoding='utf-8',errors='ignore').replace('\\/','/')
        ids={m.group(1) for m in URL_RE.finditer(text)}
        if ids:
            rel=str(p.relative_to(repo_dir))
            for i in ids: found.setdefault(i,rel)
            files.append({'file':rel,'distinctIds':len(ids),'sha256':sha256_file(p)})
    return set(found), scanned, sorted(files,key=lambda x:(-x['distinctIds'],x['file']))

def main():
    baseline=set(); parts=[]
    for p in BASELINE_FILES:
        ids=read_ids(p); baseline |= ids; parts.append({'file':str(p),'ids':len(ids)})
    if len(baseline) != 61302:
        raise SystemExit(f'unexpected baseline union: {len(baseline)}')

    running=set(baseline); repo_results=[]; combined_net=set()
    OUT.mkdir(parents=True,exist_ok=True)
    for full_name, slug in REPOS:
        repo_dir=ROOT/slug
        if not repo_dir.exists(): raise SystemExit(f'missing repo dir {repo_dir}')
        found, scanned, files=scan_repo(repo_dir)
        overlap=found & running
        net=found - running
        running |= found
        combined_net |= net
        (OUT/f'{slug}-net-new-ids.txt').write_text('\n'.join(sorted(net,key=int))+('\n' if net else ''),encoding='utf-8')
        repo_results.append({
            'repo':full_name,'slug':slug,'textFilesScanned':scanned,'filesWithIds':len(files),
            'files':files,'foundDistinctIds':len(found),'overlapVsRunningUnion':len(overlap),
            'exactNetNewSequential':len(net),'runningUnionAfter':len(running)
        })

    (OUT/'combined-net-new-ids.txt').write_text('\n'.join(sorted(combined_net,key=int))+('\n' if combined_net else ''),encoding='utf-8')
    summary={
        'generatedAt':datetime.now(timezone.utc).isoformat(),
        'unit':'MUBAWAB_LISTING_ID','baselineParts':parts,'baselineUnionIds':len(baseline),
        'repos':repo_results,'combinedExactNetNewSequential':len(combined_net),
        'finalMubawabUnionIds':len(running),'databaseWrites':0,'sourceSiteFetches':0,
        'publicGithubRepoFetches':len(REPOS),'githubArtifactFetches':4,'readOnly':True
    }
    (OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps(summary,indent=2,ensure_ascii=False))

if __name__=='__main__': main()
