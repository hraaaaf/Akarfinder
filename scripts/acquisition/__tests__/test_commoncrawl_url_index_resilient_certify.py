import importlib.util
import pathlib
import sys
import unittest

ACQ_DIR = pathlib.Path(__file__).parents[1]
sys.path.insert(0, str(ACQ_DIR))
MODULE_PATH = ACQ_DIR / "commoncrawl_url_index_resilient_certify.py"
SPEC = importlib.util.spec_from_file_location("cc_resilient", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class ResilientUrlIndexTests(unittest.TestCase):
    def test_classifies_transient_index_failures_and_429(self):
        self.assertEqual(MODULE.classify_index_error(Exception("HTTP Error: HTTP GET error (HTTP 503 Service Unavailable)")), "http_503")
        self.assertEqual(MODULE.classify_index_error(Exception("Transferred a partial file")), "partial_transfer")
        self.assertEqual(MODULE.classify_index_error(Exception("HTTP 429 Too Many Requests")), "http_429")

    def test_batch_merge_is_deterministic(self):
        acc = {}
        MODULE.merge_batch_rows(acc, [
            {"host": "atlasimmo.ma", "url_count": 3, "seed_urls": ["https://atlasimmo.ma/b", "https://atlasimmo.ma/a"]},
            {"host": "casa-home.ma", "url_count": 2, "seed_urls": ["https://casa-home.ma/x"]},
        ])
        MODULE.merge_batch_rows(acc, [
            {"host": "atlasimmo.ma", "url_count": 4, "seed_urls": ["https://atlasimmo.ma/c", "https://atlasimmo.ma/a"]},
        ])
        rows = MODULE.materialize_rows(acc)
        self.assertEqual(rows[0]["host"], "atlasimmo.ma")
        self.assertEqual(rows[0]["url_count"], 7)
        self.assertEqual(rows[0]["seed_urls"], ["https://atlasimmo.ma/a", "https://atlasimmo.ma/b", "https://atlasimmo.ma/c"])


if __name__ == "__main__":
    unittest.main()
