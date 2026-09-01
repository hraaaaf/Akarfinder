import importlib.util
import pathlib
import sys
import unittest

MODULE_PATH = pathlib.Path(__file__).parents[1] / "commoncrawl_url_index_domain_discovery.py"
SPEC = importlib.util.spec_from_file_location("cc_url_index", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class UrlIndexDiscoveryTests(unittest.TestCase):
    def test_latest_crawl_uses_first_current_collection(self):
        self.assertEqual(
            MODULE.latest_crawl([
                {"id": "bad"},
                {"id": "CC-MAIN-2026-34"},
                {"id": "CC-MAIN-2026-30"},
            ]),
            "CC-MAIN-2026-34",
        )

    def test_strict_property_url_rejects_false_transaction_substrings(self):
        self.assertFalse(MODULE.strict_property_url("http://04.ma/2020/01/02/location-de-voitures/"))
        self.assertFalse(MODULE.strict_property_url("http://04.ma/2022/03/10/ventec-maroc-recrute-plusieurs-profils/"))
        self.assertTrue(MODULE.strict_property_url("https://example.ma/location-appartement-rabat"))
        self.assertTrue(MODULE.strict_property_url("https://example.ma/vente-villa-casablanca"))
        self.assertTrue(MODULE.strict_property_url("https://atlasimmo.ma/offres/123"))

    def test_rank_rows_excludes_known_portals_and_requires_property_evidence(self):
        ranked = MODULE.rank_rows([
            {"host": "www.mubawab.ma", "url_count": 500, "seed_urls": ["https://www.mubawab.ma/fr/a/123/test"]},
            {"host": "atlasimmo.ma", "url_count": 50, "seed_urls": ["https://atlasimmo.ma/offres/1", "https://atlasimmo.ma/offres/2"]},
            {"host": "example.ma", "url_count": 10, "seed_urls": ["https://example.ma/location-de-voitures"]},
            {"host": "casa-home.ma", "url_count": 8, "seed_urls": ["https://casa-home.ma/vente-villa-casablanca"]},
        ])
        self.assertEqual([item["host"] for item in ranked], ["atlasimmo.ma", "casa-home.ma"])


if __name__ == "__main__":
    unittest.main()
