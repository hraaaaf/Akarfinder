#!/usr/bin/env python3
import hashlib
import json
import os
import re
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(os.environ.get('MARWANE_REPO_DIR', '.tmp/marwane-public-repo'))
OUT = Path(os.environ.get('MARWANE_OUT', '.tmp/marwane-mubawab-public-reconcile'))
BASELINE_FILES = [
    Path(os.environ.get('MUB_BASELINE_IDS', '.tmp/mubawab-baseline/listing-ids.txt')),
    Path(os.environ.get('MUB_REB_NET_IDS', '.tmp/realestatebuddy-baseline/net-new-ids.txt')),
    Path(os.environ.get('MUB_HICHAM_NET_IDS', '.tmp/hicham-baseline/mubawab-net-new-ids.txt')),
]
MUB_RE = re.compile(r'https?://(?:www\.)?mubawab\.ma/[^\s\"\'<>]*?/(?:a|pa)/(\d+)(?:/|$|[?#])', re.I)
PATH_RE = re.compile(r'/(?:a|pa)/(\d+)(?:/|$|[?#])', re.I)
TEXT_EXT = {'.csv','.json','.txt','.md','.py','.ipynb','.ts','.js','.html','.xml','.yml','.yaml'}

def read_ids(path: Path):
    if not path.exists():
        raise SystemExit(f'missing baseline file: {path}')
    return {x.strip() for x in path.read_text(encoding='utf-8', errors='ignore').splitlines() if x.strip().isdigit()}

def sha256_file(path: Path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()

def main():
    baseline = set()
    baseline_parts = []
    for p in BASELINE_FILES:
        ids = read_ids(p)
        baseline |= ids
        baseline_parts.append({'file': str(p), 'ids': len(ids)})

    found = {}
    per_file = []
    scanned = 0
    for p in ROOT.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXT:
            continue
        scanned += 1
        try:
            text = p.read_text(encoding='utf-8', errors='ignore').replace('\\/','/')
        except Exception:
            continue
        ids = set()
        # Require explicit mubawab context for generic path matches.
        for m in MUB_RE.finditer(text):
            ids.add(m.group(1))
        if 'mubawab' in text.lower():
            for m in PATH_RE.finditer(text):
                ids.add(m.group(1))
        if ids:
            rel = str(p.relative_to(ROOT))
            for i in ids:
                found.setdefault(i, rel)
            per_file.append({'file': rel, 'distinctIds': len(ids), 'sha256': sha256_file(p)})

    found_ids = set(found)
    overlap = found_ids & baseline
    net = found_ids - baseline
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'net-new-ids.txt').write_text('\n'.join(sorted(net, key=int)) + ('\n' if net else ''), encoding='utf-8')
    (OUT/'all-found-ids.txt').write_text('\n'.join(sorted(found_ids, key=int)) + ('\n' if found_ids else ''), encoding='utf-8')
    summary = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'unit': 'MUBAWAB_LISTING_ID',
        'publicDatasetRepo': 'MarwaneMLE/morocco-appartements-price',
        'baselineParts': baseline_parts,
        'baselineUnionIds': len(baseline),
        'textFilesScanned': scanned,
        'filesWithIds': len(per_file),
        'perFile': sorted(per_file, key=lambda x: (-x['distinctIds'], x['file'])),
        'foundDistinctIds': len(found_ids),
        'exactOverlapBaselineUnion': len(overlap),
        'exactNetNewVsBaselineUnion': len(net),
        'databaseWrites': 0,
        'sourceSiteFetches': 0,
        'publicGithubRepoFetches': 1,
        'githubArtifactFetches': 3,
        'readOnly': True,
    }
    (OUT/'summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
    print(json.dumps(summary, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
