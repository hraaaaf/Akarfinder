import json
import unittest
from pathlib import Path

from scripts.audits.reconcile_local_neon_source_keys import is_ascii_id, load_archive, reconcile


class LocalNeonOverlapTests(unittest.TestCase):
    def test_real_archive_integrity_if_present(self):
        path = Path('/mnt/data/akar-200k-isolated-inventory.zip')
        if not path.exists():
            self.skipTest('Local fixture unavailable on CI')
        local = load_archive(path)
        self.assertEqual({name: len(ids) for name, ids in local.items()},
                         {'avito': 27106, 'mubawab': 5354})

    def test_exact_intersection_and_unknown_keys(self):
        result = reconcile({'avito': {'12', '13'}, 'mubawab': {'88'}}, [
            ('avito.ma', '12'), ('avito.ma', '12'), ('avito.ma', None),
            ('avito.ma', 'opaque'), ('avito.ma', '14'),
            ('mubawab.ma', '88'), ('mubawab', None), ('sarout.ma', '88')])
        self.assertEqual(result['sources']['avito']['exact_intersection'], 1)
        self.assertEqual(result['sources']['avito']['strict_explicit_key_union'], 3)
        self.assertEqual(result['sources']['mubawab']['exact_intersection'], 1)
        self.assertEqual(result['skipped_rows']['avito_missing_key'], 1)
        self.assertEqual(result['skipped_rows']['avito_nonnumeric_key'], 1)
        self.assertEqual(result['skipped_rows']['unsupported_source'], 1)
        self.assertNotIn('opaque', json.dumps(result))
        self.assertNotIn('source_offer_key', json.dumps(result))

    def test_no_unsafe_numeric_normalization(self):
        result = reconcile({'avito': {'0012'}, 'mubawab': set()}, [('avito.ma', '12')])
        self.assertEqual(result['sources']['avito']['exact_intersection'], 0)
        self.assertFalse(is_ascii_id('١٢٣'))
        self.assertTrue(is_ascii_id('123'))


if __name__ == '__main__':
    unittest.main()
