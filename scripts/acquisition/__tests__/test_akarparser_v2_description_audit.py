import gzip
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v2_description_audit import audit, summarize


class DescriptionAuditTests(unittest.TestCase):
    @staticmethod
    def write(path, data):
        path.parent.mkdir(parents=True, exist_ok=True)
        with gzip.open(path, 'wt', encoding='utf-8') as h:
            for row in data:
                h.write(json.dumps(row) + '\n')

    def make(self, root, full, sampled, parsed):
        source = root / 'private_source.jsonl.gz'
        sample = root / 'private_sample.jsonl.gz'
        folder = root / 'parsed'
        self.write(source, full)
        self.write(sample, sampled)
        self.write(folder / 'records.jsonl.gz', parsed)
        self.write(folder / 'quarantine.jsonl.gz', [])
        self.write(folder / 'duplicates.jsonl.gz', [])
        return source, sample, folder

    def test_parser_missing_description(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            row = {'source_name': 'domio', 'raw_json': '{"description":"PRIVATE SOURCE VALUE"}'}
            src, sample, parsed = self.make(root, [row], [row],
                                            [{'extracted': {'description': None}}])
            report = audit(src, sample, parsed, root / 'out.json', 1, 1)
            self.assertEqual(report['finding'], 'SELECTED_DESCRIPTIONS_LOST_BY_PARSER')
            self.assertEqual(report['full_export']['aliases']['raw_json.description'], 1)
            self.assertNotIn('PRIVATE SOURCE VALUE', (root / 'out.json').read_text())

    def test_empty_selected_sample_distinct_from_export(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            a = {'source_name': 'avito', 'description_snippet': 'private'}
            b = {'source_name': 'avito', 'description_snippet': ''}
            src, sample, parsed = self.make(root, [a,b], [b],
                                            [{'extracted': {'description': None}}])
            self.assertEqual(audit(src,sample,parsed,root/'out.json',2,1)['finding'],
                             'NO_DESCRIPTIONS_IN_SELECTED_SAMPLE')

    def test_no_recognized_descriptions_in_export(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            row = {'source_name': 'other'}
            src, sample, parsed = self.make(root, [row], [row],
                                            [{'extracted': {'description': None}}])
            self.assertEqual(audit(src,sample,parsed,root/'out.json',1,1)['finding'],
                             'NO_RECOGNIZED_DESCRIPTIONS_IN_EXPORT')

    def test_never_overwrites_and_must_check_row_count(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            row = {'description_snippet': 'secret'}
            src,sample,parsed = self.make(root,[row],[row],
                                          [{'extracted': {'description': 'secret'}}])
            with self.assertRaisesRegex(ValueError,'COUNT_MISMATCH'):
                audit(src,sample,parsed,root/'out.json',2,1)
            audit(src,sample,parsed,root/'out.json',1,1)
            with self.assertRaises(FileExistsError):
                audit(src,sample,parsed,root/'out.json',1,1)

    def test_invalid_json_and_non_objects_refused(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            src=root/'invalid.jsonl.gz'
            self.write(src, [123])
            with self.assertRaisesRegex(ValueError,'NOT_A_JSON_OBJECT'):
                summarize(src,1)


if __name__ == '__main__':
    unittest.main()
