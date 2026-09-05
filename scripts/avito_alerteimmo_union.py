#!/usr/bin/env python3
import argparse
import hashlib
import json
from pathlib import Path


def read_ids(path):
    return {x.strip() for x in Path(path).read_text(encoding='utf-8').splitlines() if x.strip()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--baseline', required=True)
    ap.add_argument('--shards-dir', required=True)
    ap.add_argument('--output', required=True)
    ap.add_argument('--expected-shards', type=int, default=8)
    args = ap.parse_args()

    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    baseline = read_ids(args.baseline)
    if len(baseline) != 6581:
        raise SystemExit(f'Expected certified baseline 6581, got {len(baseline)}')

    shard_root = Path(args.shards_dir)
    summaries = sorted(shard_root.glob('**/summary.json'))
    if len(summaries) != args.expected_shards:
        raise SystemExit(f'Expected {args.expected_shards} shard summaries, got {len(summaries)}')

    seen_indexes = set()
    ids = set()
    records = {}
    shard_stats = []
    any_truncated = False
    total_pages = 0
    total_errors = 0

    for sp in summaries:
        d = json.loads(sp.read_text(encoding='utf-8'))
        idx = int(d['shard']['index'])
        count = int(d['shard']['count'])
        if count != args.expected_shards:
            raise SystemExit(f'Unexpected shard count in {sp}: {count}')
        if idx in seen_indexes:
            raise SystemExit(f'Duplicate shard index {idx}')
        seen_indexes.add(idx)
        if d['safety']['direct_avito_requests'] != 0:
            raise SystemExit(f'Unsafe shard {idx}: direct Avito requests reported')
        sid_path = sp.parent / 'alerteimmo_ids.txt'
        if not sid_path.exists():
            raise SystemExit(f'Missing IDs file for shard {idx}')
        shard_ids = read_ids(sid_path)
        ids |= shard_ids
        total_pages += int(d['pages_visited'])
        total_errors += len(d.get('errors', []))
        any_truncated = any_truncated or bool(d['limits']['truncated'])
        shard_stats.append({
            'index': idx,
            'ids': len(shard_ids),
            'pages_visited': int(d['pages_visited']),
            'truncated': bool(d['limits']['truncated']),
            'errors': len(d.get('errors', [])),
        })

        rp = sp.parent / 'records.jsonl'
        if rp.exists():
            for line in rp.read_text(encoding='utf-8').splitlines():
                if not line.strip():
                    continue
                r = json.loads(line)
                aid = str(r['id'])
                cur = records.setdefault(aid, {'id': aid, 'avito_url': r.get('avito_url'), 'evidence_pages': []})
                for page in r.get('evidence_pages', []):
                    if page not in cur['evidence_pages'] and len(cur['evidence_pages']) < 10:
                        cur['evidence_pages'].append(page)

    if seen_indexes != set(range(args.expected_shards)):
        raise SystemExit(f'Shard indexes incomplete: {sorted(seen_indexes)}')

    overlap = ids & baseline
    net_new = ids - baseline
    union = ids | baseline

    for name, values in (
        ('alerteimmo_ids.txt', ids),
        ('overlap_ids.txt', overlap),
        ('net_new_ids.txt', net_new),
        ('union_ids.txt', union),
    ):
        (out / name).write_text('\n'.join(sorted(values, key=int)) + ('\n' if values else ''), encoding='utf-8')

    with (out / 'records.jsonl').open('w', encoding='utf-8') as f:
        for aid in sorted(records, key=int):
            f.write(json.dumps(records[aid], ensure_ascii=False, sort_keys=True) + '\n')

    summary = {
        'source': 'alerteimmo.ma public HTML + sitemap, 8 deterministic shards',
        'baseline_unique_ids': len(baseline),
        'alerteimmo_unique_avito_ids': len(ids),
        'overlap_with_baseline': len(overlap),
        'net_new_vs_baseline': len(net_new),
        'union_unique_ids': len(union),
        'gain_pct': round((len(net_new) / len(baseline)) * 100, 4),
        'shards_expected': args.expected_shards,
        'shards_received': len(summaries),
        'pages_visited_total': total_pages,
        'errors_total': total_errors,
        'any_shard_truncated': any_truncated,
        'shards': sorted(shard_stats, key=lambda x: x['index']),
        'safety': {'direct_avito_requests': 0, 'avito_content_fetched': False},
        'exhaustive_claim': False,
    }
    (out / 'summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + '\n', encoding='utf-8')

    hashes = []
    for p in sorted(out.iterdir()):
        if p.name == 'SHA256SUMS':
            continue
        hashes.append(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}')
    (out / 'SHA256SUMS').write_text('\n'.join(hashes) + '\n', encoding='utf-8')
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
