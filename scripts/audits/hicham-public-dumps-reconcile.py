#!/usr/bin/env python3
import json, os, re, hashlib
from pathlib import Path

OUT = Path(os.environ.get('HICHAM_OUT', '.tmp/hicham-public-dumps-reconcile'))
DATA_DIR = Path(os.environ.get('HICHAM_DATA_DIR', '.tmp/hicham-public-dumps'))
MUB_BASELINE = Path(os.environ.get('MUB_BASELINE_IDS', '.tmp/mubawab-baseline/listing-ids.txt'))
MUB_REB_NET = Path(os.environ.get('MUB_REB_NET_IDS', '.tmp/realestatebuddy-baseline/net-new-ids.txt'))
AVITO_BASELINE = Path(os.environ.get('AVITO_BASELINE_IDS', '.tmp/avito-baseline/union_ids.txt'))

URL_RE = re.compile(r'https?://[^\s\"\'<>]+', re.I)
MUB_ID_RE = re.compile(r'/(?:a|pa)/(\d+)(?:/|$)', re.I)
AVITO_ID_RE = re.compile(r'(\d{6,})\.htm(?:$|[?#])', re.I)


def sha256_file(p: Path):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()

def read_ids(p: Path):
    return {x.strip() for x in p.read_text(encoding='utf-8', errors='ignore').splitlines() if x.strip().isdigit()}

def clean_url(u: str):
    return u.rstrip('.,;)]}')

def scan_file(p: Path):
    text=p.read_text(encoding='utf-8', errors='ignore').replace('\\/','/')
    mub, avito = {}, {}
    for m in URL_RE.finditer(text):
        u=clean_url(m.group(0))
        lu=u.lower()
        if 'mubawab.ma/' in lu:
            im=MUB_ID_RE.search(u)
            if im: mub.setdefault(im.group(1), u)
        elif 'avito.ma/' in lu:
            ia=AVITO_ID_RE.search(u)
            if ia: avito.setdefault(ia.group(1), u)
    return mub, avito

def main():
    for p in [MUB_BASELINE, MUB_REB_NET, AVITO_BASELINE]:
        if not p.exists(): raise SystemExit(f'missing baseline file {p}')
    mub_baseline=read_ids(MUB_BASELINE)|read_ids(MUB_REB_NET)
    avito_baseline=read_ids(AVITO_BASELINE)
    mub_all, avito_all = {}, {}
    per_file=[]
    files=sorted([p for p in DATA_DIR.iterdir() if p.is_file()])
    for p in files:
        mub,avito=scan_file(p)
        for k,v in mub.items(): mub_all.setdefault(k,v)
        for k,v in avito.items(): avito_all.setdefault(k,v)
        per_file.append({'file':p.name,'sha256':sha256_file(p),'mubawabDistinctIds':len(mub),'avitoDistinctIds':len(avito)})
    mub_ids=set(mub_all); avito_ids=set(avito_all)
    mub_overlap=mub_ids&mub_baseline; mub_net=mub_ids-mub_baseline
    avito_overlap=avito_ids&avito_baseline; avito_net=avito_ids-avito_baseline
    summary={
      'generatedAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
      'unit':'SOURCE_LISTING_ID',
      'publicDatasetRepo':'HichamBenelmahi/analyse-des-tendances-immobili-res-',
      'files':per_file,
      'mubawabBaselineUnionIds':len(mub_baseline),
      'mubawabDumpDistinctIds':len(mub_ids),
      'mubawabExactOverlapBaselineUnion':len(mub_overlap),
      'mubawabExactNetNewVsBaselineUnion':len(mub_net),
      'avitoBaselineUnionIds':len(avito_baseline),
      'avitoDumpDistinctIds':len(avito_ids),
      'avitoExactOverlapBaselineUnion':len(avito_overlap),
      'avitoExactNetNewVsBaselineUnion':len(avito_net),
      'combinedExactNetNew':len(mub_net)+len(avito_net),
      'databaseWrites':0,
      'sourceSiteFetches':0,
      'publicGithubDatasetFetches':len(files),
      'githubArtifactFetches':3,
      'readOnly':True,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    (OUT/'mubawab-net-new-ids.txt').write_text('\n'.join(sorted(mub_net,key=int))+('\n' if mub_net else ''),encoding='utf-8')
    (OUT/'mubawab-net-new-urls.txt').write_text('\n'.join(mub_all[i] for i in sorted(mub_net,key=int))+('\n' if mub_net else ''),encoding='utf-8')
    (OUT/'avito-net-new-ids.txt').write_text('\n'.join(sorted(avito_net,key=int))+('\n' if avito_net else ''),encoding='utf-8')
    (OUT/'avito-net-new-urls.txt').write_text('\n'.join(avito_all[i] for i in sorted(avito_net,key=int))+('\n' if avito_net else ''),encoding='utf-8')
    print(json.dumps(summary,indent=2,ensure_ascii=False))

if __name__=='__main__': main()
