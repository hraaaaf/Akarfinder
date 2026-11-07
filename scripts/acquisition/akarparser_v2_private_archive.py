#!/usr/bin/env python3
"""Q1E offline archival of a previously verified historical export.

No network, no cloud secrets, no database writes. The source and its two
independent-volume copies are verified; raw rows never appear in the log.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
from typing import Any

VERSION = 'akarparser-v2-private-archive-1.0'
EXPECTED_RECOVERY_SHA256 = 'c3d8a8c9476602baa7663d1e9903e6015cb7300d6e7539183bf48b735cb76b08'
EXPECTED_RECOVERY_ROWS = 151900


def sha256(path: Path) -> str:
    value = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


def validate_export(path: Path, *, expected_sha256: str, expected_rows: int) -> dict[str, Any]:
    if not path.is_file() or not path.name.endswith('.jsonl.gz'):
        raise ValueError('EXPECTED_GZIP_JSONL_SOURCE')
    if not re.fullmatch('[0-9a-f]{64}', expected_sha256) or expected_rows <= 0:
        raise ValueError('INVALID_EXPECTED_SOURCE_MANIFEST')
    digest = sha256(path)
    if digest != expected_sha256:
        raise ValueError('SOURCE_SHA256_MISMATCH')
    count = 0
    try:
        with gzip.open(path, 'rt', encoding='utf-8') as src:
            for line in src:
                if not line.strip():
                    raise ValueError('EMPTY_JSONL_ROW')
                row = json.loads(line)
                if not isinstance(row, dict):
                    raise ValueError('NON_OBJECT_JSONL_ROW')
                count += 1
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError('INVALID_SOURCE_FORMAT') from exc
    if count != expected_rows:
        raise ValueError('SOURCE_COUNT_MISMATCH')
    if sha256(path) != digest:
        raise RuntimeError('SOURCE_CHANGED_DURING_VALIDATION')
    return {'sha256': digest, 'rows': count, 'bytes': path.stat().st_size}


def different_devices(primary_root: Path, replica_root: Path) -> bool:
    if primary_root.resolve() == replica_root.resolve():
        return False
    # Windows st_dev distinguishes different volumes. Requiring both checks
    # prevents counting two folders on the same physical logical volume.
    return (os.stat(primary_root).st_dev != os.stat(replica_root).st_dev
            and primary_root.resolve().anchor.lower() != replica_root.resolve().anchor.lower())


def atomic_immutable_copy(source: Path, target: Path, digest: str) -> None:
    if target.exists():
        if sha256(target) != digest:
            raise RuntimeError('ARCHIVED_SOURCE_DIGEST_CONFLICT')
        return  # Exact immutable archive replay: no overwrite.
    target.parent.mkdir(parents=True, exist_ok=True)
    pending = target.with_suffix(target.suffix + '.pending')
    if pending.exists():
        raise FileExistsError('PENDING_ARCHIVE_ALREADY_EXISTS')
    try:
        with source.open('rb') as src, pending.open('xb') as dst:
            shutil.copyfileobj(src, dst, length=1024 * 1024)
            dst.flush()
            os.fsync(dst.fileno())
        if sha256(pending) != digest:
            raise RuntimeError('ARCHIVE_COPY_DIGEST_MISMATCH')
        # Exclusive link avoids replacing even if another process races us.
        os.link(pending, target)
    finally:
        pending.unlink(missing_ok=True)


def archive(source: Path, primary_root: Path, replica_root: Path, *,
            expected_sha256: str = EXPECTED_RECOVERY_SHA256,
            expected_rows: int = EXPECTED_RECOVERY_ROWS,
            allow_same_device_for_tests: bool = False) -> dict[str, Any]:
    for root in (primary_root, replica_root):
        if not root.is_dir():
            raise FileNotFoundError('ARCHIVE_ROOT_MUST_EXIST')
    if source.resolve() == primary_root.resolve() or source.resolve() == replica_root.resolve():
        raise ValueError('ARCHIVE_ROOT_IS_SOURCE')
    if not different_devices(primary_root, replica_root) and not allow_same_device_for_tests:
        raise ValueError('REPLICA_MUST_USE_DISTINCT_STORAGE_VOLUME')
    if (source.resolve().is_relative_to(primary_root.resolve())
        or source.resolve().is_relative_to(replica_root.resolve())):
        raise ValueError('SOURCE_MUST_NOT_BE_INSIDE_ARCHIVE_ROOT')
    result = validate_export(source, expected_sha256=expected_sha256, expected_rows=expected_rows)
    digest = result['sha256']
    # Content-addressed location: no overwrite or synthetic version timestamp.
    base = f'neon-recovery-151900-{digest[:16]}'
    names = ((primary_root, base, source.name), (replica_root, base, source.name))
    for root, folder, filename in names:
        target = root / folder / filename
        atomic_immutable_copy(source, target, digest)
        validate_export(target, expected_sha256=digest, expected_rows=expected_rows)
    if sha256(source) != digest:
        raise RuntimeError('SOURCE_CHANGED_DURING_ARCHIVE')
    manifest = {
        'version': VERSION, 'input_sha256': digest, 'input_rows': expected_rows,
        'input_bytes': result['bytes'], 'copies': 2,
        'copy_sha256_match': True, 'replica_separate_volume': not allow_same_device_for_tests,
        'source_unchanged': True, 'network_requests': 0,
        'cloud_database_writes': 0, 'new_detailed_observations_certified': 0,
        'publication_authorized': False,
    }
    for root, folder, _ in names:
        report = root / folder / 'aggregate_archive_manifest.json'
        rendered = json.dumps(manifest, sort_keys=True, indent=2) + '\n'
        if report.exists():
            if report.read_text(encoding='utf-8') != rendered:
                raise RuntimeError('ARCHIVED_MANIFEST_CONFLICT')
        else:
            with report.open('x', encoding='utf-8') as f:
                f.write(rendered)
    return manifest


def main() -> None:
    p = argparse.ArgumentParser(description='Verify and immutably archive private historical JSONL on two volumes')
    p.add_argument('--input', required=True, type=Path)
    p.add_argument('--primary-root', required=True, type=Path)
    p.add_argument('--replica-root', required=True, type=Path)
    p.add_argument('--expected-sha256', default=EXPECTED_RECOVERY_SHA256)
    p.add_argument('--expected-rows', default=EXPECTED_RECOVERY_ROWS, type=int)
    args = p.parse_args()
    outcome = archive(args.input, args.primary_root, args.replica_root,
                      expected_sha256=args.expected_sha256, expected_rows=args.expected_rows)
    print(json.dumps(outcome, sort_keys=True))


if __name__ == '__main__':
    main()
