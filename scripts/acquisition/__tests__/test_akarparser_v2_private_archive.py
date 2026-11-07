"""Synthetic tests; never persist private listing rows to GitHub."""
from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v2_private_archive import archive, sha256, validate_export


def fixture(root: Path, n: int = 4) -> Path:
    inp = root / 'source.jsonl.gz'
    with gzip.open(inp, 'wt', encoding='utf-8') as z:
        for k in range(n):
            z.write(json.dumps({'id': k + 1, 'title': f'Synthetic {k + 1}'}) + '\n')
    return inp


class ArchiveTests(unittest.TestCase):
    def test_validates_hash_and_exact_row_count(self):
        with tempfile.TemporaryDirectory() as t:
            inp = fixture(Path(t))
            r = validate_export(inp, expected_sha256=sha256(inp), expected_rows=4)
            self.assertEqual(r['rows'], 4)
            with self.assertRaisesRegex(ValueError, 'SOURCE_COUNT_MISMATCH'):
                validate_export(inp, expected_sha256=sha256(inp), expected_rows=3)
            with self.assertRaisesRegex(ValueError, 'SOURCE_SHA256_MISMATCH'):
                validate_export(inp, expected_sha256='0'*64, expected_rows=4)

    def test_requires_distinct_volume_in_real_mode(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t); inp = fixture(root)
            (root / 'primary').mkdir(); (root / 'replica').mkdir()
            with self.assertRaisesRegex(ValueError, 'REPLICA_MUST_USE_DISTINCT_STORAGE_VOLUME'):
                archive(inp, root / 'primary', root / 'replica',
                        expected_sha256=sha256(inp), expected_rows=4)

    def test_exact_replay_rejected_no_original_mutation(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t); inp = fixture(root)
            for name in ('primary', 'replica'):
                (root / name).mkdir()
            digest=sha256(inp)
            result=archive(inp, root / 'primary', root / 'replica',
                           expected_sha256=digest, expected_rows=4,
                           allow_same_device_for_tests=True)
            self.assertEqual(result['copies'], 2)
            self.assertTrue(result['copy_sha256_match'])
            self.assertEqual(sha256(inp), digest)
            for name in ('primary', 'replica'):
                dest=list((root/name).glob('*/source.jsonl.gz'))
                self.assertEqual(len(dest), 1)
                self.assertEqual(sha256(dest[0]), digest)
            replay = archive(inp, root / 'primary', root / 'replica',
                             expected_sha256=digest, expected_rows=4,
                             allow_same_device_for_tests=True)
            self.assertEqual(replay, result)

    def test_invalid_json_object_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            path=Path(t)/'bad.jsonl.gz'
            with gzip.open(path,'wt',encoding='utf-8') as w:
                w.write('[]\n')
            with self.assertRaisesRegex(ValueError,'NON_OBJECT_JSONL_ROW'):
                validate_export(path, expected_sha256=sha256(path), expected_rows=1)

    def test_input_inside_destination_is_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t); p=(root/'primary');r=(root/'replica');p.mkdir();r.mkdir()
            inp=fixture(p)
            with self.assertRaisesRegex(ValueError, 'SOURCE_MUST_NOT_BE_INSIDE_ARCHIVE_ROOT'):
                archive(inp,p,r,expected_sha256=sha256(inp),expected_rows=4,
                        allow_same_device_for_tests=True)


if __name__ == '__main__':
    unittest.main()
