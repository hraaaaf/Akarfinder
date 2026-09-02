import importlib.util
import pathlib
import sys
import unittest

ACQ_DIR = pathlib.Path(__file__).parents[1]
MODULE_PATH = ACQ_DIR / "cross_source_dedupe.py"
SPEC = importlib.util.spec_from_file_location("cross_source_dedupe", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def rec(source, url, city="Rabat", ptype="apartment", tx="sale", surface=120, price=1800000, bedrooms=3, baths=2, neighborhood="Agdal", external=None):
    return {
        "source_id": source,
        "source_url": url,
        "external_offer_id": external,
        "location.city": city,
        "location.neighborhood": neighborhood,
        "classification.property_type": ptype,
        "offer.transaction_type": tx,
        "surfaces.surface_total_m2": surface,
        "offer.price_amount": price,
        "layout.bedrooms_count": bedrooms,
        "layout.bathrooms_count": baths,
    }


class CrossSourceDedupeTests(unittest.TestCase):
    def test_exact_url_dedupes(self):
        a = rec("a", "https://www.example.ma/p/1?utm_source=x")
        b = rec("b", "https://example.ma/p/1")
        self.assertTrue(MODULE.pair_decision(a, b)["merge"])

    def test_exact_source_offer_id_dedupes(self):
        a = rec("mubawab", "https://x.ma/a", external="123")
        b = rec("mubawab", "https://x.ma/b", external="123")
        self.assertEqual(MODULE.pair_decision(a, b)["reasons"], ["exact_source_offer_id"])

    def test_cross_source_strong_match_merges(self):
        a = rec("mubawab", "https://mubawab.ma/a/1")
        b = rec("agency", "https://agency.ma/property/1", surface=124, price=1870000)
        d = MODULE.pair_decision(a, b)
        self.assertTrue(d["merge"])
        self.assertGreaterEqual(d["score"], 70)

    def test_city_contradiction_blocks(self):
        a = rec("a", "https://a.ma/1", city="Rabat")
        b = rec("b", "https://b.ma/1", city="Casablanca")
        self.assertIn("contradict_city", MODULE.pair_decision(a, b)["rejects"])

    def test_material_surface_difference_blocks(self):
        a = rec("a", "https://a.ma/1", surface=100)
        b = rec("b", "https://b.ma/1", surface=160)
        self.assertIn("contradict_surface_gt25pct", MODULE.pair_decision(a, b)["rejects"])

    def test_cluster_preserves_all_source_urls(self):
        records = [
            rec("mubawab", "https://mubawab.ma/a/1"),
            rec("agency", "https://agency.ma/property/1", surface=124, price=1870000),
            rec("other", "https://other.ma/property/2", city="Casablanca"),
        ]
        out = MODULE.cluster_records(records)
        self.assertEqual(out["cluster_count"], 2)
        merged = [c for c in out["clusters"] if len(c["members"]) == 2][0]
        self.assertEqual(len(merged["source_urls"]), 2)
        self.assertTrue(out["zeroDbWrites"])


if __name__ == "__main__":
    unittest.main()
