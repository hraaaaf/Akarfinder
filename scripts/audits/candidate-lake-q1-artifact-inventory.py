#!/usr/bin/env python3
"""Read-only inventory of frozen Candidate Lake proof artifacts.

This is an evidence-availability report, NEVER a 253372-row candidate manifest.
The GitHub workflow writes download-status.tsv before invoking this tool.
"""
from __future__ import annotations

import csv
import hashlib
import json
import os
import re
from pathlib import Path

ROOT = Path(os.environ.get('Q1_ARTIFACT_ROOT', '.tmp/q1-artifacts'))
OUT = Path(os.environ.get('Q1_INVENTORY_OUT', '.tmp/q1-artifact-inventory'))
CATALOG = Path(os.environ.get('Q1_ARTIFACT_CATALOG', Path(__file__).with_name('candidate-lake-q1-artifact-catalog.json')))
TEXT_EXT = {'.txt', '.csv', '.json', '.jsonl', '.ndjson', '.tsv'}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for part in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(part)
    return h.hexdigest()


def sample(path: Path, n: int = 2) -> list[str]:
    if path.suffix.lower() not in TEXT_EXT:
        return []
    try:
        with path.open('r', encoding='utf-8', errors='replace') as f:
            return [line.rstrip()[:240] for _, line in zip(range(n), f)]
    except OSError:
        return []


def inventory(root: Path, catalog: list[dict], status_path: Path) -> dict:
    expected: dict[str, str] = {}
    for entry in catalog:
        key, slug = str(entry['id']), entry['slug']
        if not key.isdigit() or not re.fullmatch(r'[a-z0-9][a-z0-9-]*', slug):
            raise ValueError('invalid catalog id or slug')
        if key in expected or slug in expected.values():
            raise ValueError('duplicate catalog artifact id or slug')
        expected[key] = slug

    statuses: dict[str, str] = {}
    if status_path.exists():
        with status_path.open(encoding='utf-8', newline='') as file:
            for row in csv.reader(file, delimiter='\t'):
                if len(row) != 2 or row[0] not in expected or row[0] in statuses:
                    raise ValueError('invalid or duplicate download-status.tsv row')
                statuses[row[0]] = row[1]

    out = []
    for artifact_id, slug in expected.items():
        dirname = root / f'{artifact_id}-{slug}'
        files = []
        if dirname.is_dir():
            for path in sorted(p for p in dirname.rglob('*') if p.is_file()):
                record = {'path': path.relative_to(dirname).as_posix(),
                          'bytes': path.stat().st_size, 'sha256': sha256(path)}
                if path.suffix.lower() in TEXT_EXT:
                    with path.open('rb') as stream:
                        record['lines'] = sum(1 for _ in stream)
                    record['sample'] = sample(path)
                files.append(record)
        status = statuses.get(artifact_id, 'NOT_CHECKED')
        available = status == 'OK' and len(files) > 0
        out.append({'id': artifact_id, 'slug': slug, 'downloadStatus': status,
                    'available': available, 'fileCount': len(files), 'files': files})

    available = [a['id'] for a in out if a['available']]
    missing = [a['id'] for a in out if not a['available']]
    return {'schemaVersion': 2, 'purpose': 'artifact_availability_only',
            'expectedArtifactCount': len(expected), 'availableArtifactCount': len(available),
            'missingArtifactCount': len(missing), 'availableArtifactIds': available,
            'missingArtifactIds': missing, 'completeProofCoverage': not missing,
            'candidateUnionCertified': False, 'canonicalHistoricalCandidateCount': 253372,
            'artifacts': out, 'databaseWrites': 0, 'productionWrites': 0,
            'sourceSiteFetches': 0, 'readOnly': True}


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    result = inventory(ROOT, catalog, OUT / 'download-status.tsv')
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'inventory.json').write_text(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k != 'artifacts'}, sort_keys=True, indent=2))


if __name__ == '__main__':
    main()
