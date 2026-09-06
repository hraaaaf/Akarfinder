#!/usr/bin/env python3
import csv, hashlib, json, os, re
from pathlib import Path
from urllib.parse import urlparse

OUT = Path(os.environ.get('REB_OUT', '.tmp/realestatebuddy-mubawab-reconcile'))
DATASET = Path(os.environ.get('REB_DATASET', '.tmp/realestatebuddy/Clean_Data_Step2.csv'))
BASELINE_IDS = Path(os.environ.get('MUBAWAB_BASELINE_IDS', '.tmp/mubawab-baseline/listing-ids.txt'))
ID_RE = re.compile(r'/a/(\d+)(?:/|$)')

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def canon_url(raw: str) -> str:
    raw = (raw or '').strip()
    try:
        u = urlparse(raw)
        host = (u.hostname or '').lower()
        if host.startswith('www.'):
            host = host[4:]
        path = u.path.rstrip('/') or '/'
        scheme = (u.scheme or 'https').lower()
        return f'{scheme}://{host}{path}'
    except Exception:
        return raw

def main():
    if not DATASET.exists():
        raise SystemExit(f'missing dataset: {DATASET}')
    if not BASELINE_IDS.exists():
        raise SystemExit(f'missing baseline ids: {BASELINE_IDS}')

    baseline_ids = {x.strip() for x in BASELINE_IDS.read_text(encoding='utf-8').splitlines() if x.strip().isdigit()}
    dataset_ids = set()
    dataset_urls = {}
    row_count = 0
    invalid_or_non_mubawab = 0
    headers = []

    with DATASET.open('r', encoding='utf-8-sig', newline='') as f:
        sample = f.read(65536)
        f.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=',;\t|')
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(f, dialect=dialect)
        headers = reader.fieldnames or []
        url_col = next((h for h in headers if h and h.strip().lower() == 'url'), None)
        if not url_col:
            raise SystemExit(f'no exact url column found; headers={headers}')
        for row in reader:
            row_count += 1
            raw = (row.get(url_col) or '').strip()
            if not raw:
                invalid_or_non_mubawab += 1
                continue
            try:
                u = urlparse(raw)
                host = (u.hostname or '').lower().removeprefix('www.')
            except Exception:
                invalid_or_non_mubawab += 1
                continue
            m = ID_RE.search(u.path or '')
            if host != 'mubawab.ma' or not m:
                invalid_or_non_mubawab += 1
                continue
            lid = m.group(1)
            dataset_ids.add(lid)
            dataset_urls.setdefault(lid, canon_url(raw))

    overlap = dataset_ids & baseline_ids
    net_new = dataset_ids - baseline_ids
    summary = {
        'generatedAt': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
        'unit': 'MUBAWAB_LISTING_ID',
        'publicDataset': 'hakkache/RealEstateBuddy:data/Clean_Data_Step2.csv',
        'datasetSha256': sha256_file(DATASET),
        'datasetRows': row_count,
        'headers': headers,
        'baselineMubawabIds': len(baseline_ids),
        'datasetValidMubawabRowsDistinctIds': len(dataset_ids),
        'datasetDistinctUrlsForIds': len(dataset_urls),
        'invalidOrNonMubawabRows': invalid_or_non_mubawab,
        'exactIdOverlapBaseline': len(overlap),
        'exactIdNetNewVsBaseline': len(net_new),
        'databaseWrites': 0,
        'sourceSiteFetches': 0,
        'publicGithubDatasetFetches': 1,
        'githubArtifactFetches': 1,
        'readOnly': True,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    (OUT / 'net-new-ids.txt').write_text('\n'.join(sorted(net_new, key=int)) + ('\n' if net_new else ''), encoding='utf-8')
    (OUT / 'net-new-urls.txt').write_text('\n'.join(dataset_urls[i] for i in sorted(net_new, key=int) if i in dataset_urls) + ('\n' if net_new else ''), encoding='utf-8')
    (OUT / 'overlap-ids.txt').write_text('\n'.join(sorted(overlap, key=int)) + ('\n' if overlap else ''), encoding='utf-8')
    print(json.dumps(summary, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
