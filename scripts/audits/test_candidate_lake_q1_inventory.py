import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).with_name('candidate-lake-q1-artifact-inventory.py')
spec = importlib.util.spec_from_file_location('q1_inventory', MODULE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class InventoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.catalog = [{'id': 123, 'slug': 'example'}, {'id': 456, 'slug': 'second'}]
        self.status = self.root / 'download-status.tsv'

    def test_missing_proofs_do_not_certify_253k(self):
        result = mod.inventory(self.root, self.catalog, self.status)
        self.assertEqual(result['missingArtifactCount'], 2)
        self.assertEqual(result['availableArtifactCount'], 0)
        self.assertFalse(result['completeProofCoverage'])
        self.assertFalse(result['candidateUnionCertified'])
        self.assertEqual(result['sourceSiteFetches'], 0)
        self.assertEqual(result['databaseWrites'], 0)

    def test_only_verified_downloads_are_present(self):
        path = self.root / '123-example'
        path.mkdir()
        (path / 'ids.csv').write_text('id\n1\n2\n', encoding='utf-8')
        self.status.write_text('123\tOK\n456\tHTTP_404\n', encoding='utf-8')
        result = mod.inventory(self.root, self.catalog, self.status)
        self.assertEqual(result['availableArtifactIds'], ['123'])
        self.assertEqual(result['missingArtifactIds'], ['456'])
        self.assertEqual(result['artifacts'][0]['files'][0]['lines'], 3)
        self.assertEqual(result['artifacts'][0]['files'][0]['sha256'], mod.sha256(path / 'ids.csv'))

    def test_empty_ok_is_not_available(self):
        (self.root / '123-example').mkdir()
        self.status.write_text('123\tOK\n', encoding='utf-8')
        self.assertEqual(mod.inventory(self.root, self.catalog, self.status)['availableArtifactCount'], 0)

    def test_bad_status_or_duplicate_catalog_fail(self):
        self.status.write_text('999\tOK\n', encoding='utf-8')
        with self.assertRaises(ValueError):
            mod.inventory(self.root, self.catalog, self.status)
        self.status.unlink()
        with self.assertRaises(ValueError):
            mod.inventory(self.root, self.catalog + [self.catalog[0]], self.status)


if __name__ == '__main__':
    unittest.main()
