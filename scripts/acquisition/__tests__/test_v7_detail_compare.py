"""No-source-fetch V7 comparative benchmark: real existing L4 and V3 parsers."""
from datetime import datetime, timezone
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from v7_multisource.detail_compare import (
    DetailBenchmarkError, compare_supplied_html, benchmark_supplied_cases,
)

AT = datetime(2026, 11, 12, 21, tzinfo=timezone.utc)
AG = "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810"
FE = "https://www.feenway.com/listings/258638"
ORI = "https://www.mubawab.ma/fr/a/9961000/flat"
HTML = """<html><head><title>Appartement à vendre à Rabat - 850 000 DH</title>
<script type="application/ld+json">{"@type":"Apartment", "name":"Appartement à vendre",
"offers":{"price":850000,"priceCurrency":"MAD"},
"floorSize":{"value":90,"unitCode":"MTK"},
"address":{"addressLocality":"Rabat","streetAddress":"Agdal"}}</script></head>
<body><h1>Appartement à vendre à Rabat</h1>
<div>Quartier: Agdal</div><div>Surface 90 m²</div>
<div>Prix: 850 000 DH</div></body></html>"""


class RealParsersOfflineTests(unittest.TestCase):
    def test_actual_l4_and_actual_v3_compare_same_html(self):
        r = compare_supplied_html({
            "source_url": AG, "raw_html": HTML,
            "observation_ref": "synthetic_fixture_only",
            "expected": {"price_mad": 850000, "surface_total_m2": 90},
        }, as_of=AT)
        self.assertEqual(r["source_domain"], "agenz.ma")
        self.assertEqual(r["l4_page_kind"], "listing_detail")
        self.assertEqual(r["field_comparison"]["price_mad"]["v3"], 850000)
        self.assertEqual(r["field_comparison"]["price_mad"]["l4"], 850000)
        self.assertEqual(r["field_comparison"]["surface_total_m2"]["v3"], 90)
        self.assertEqual(r["field_comparison"]["surface_total_m2"]["l4"], 90)
        self.assertTrue(r["field_comparison"]["price_mad"]["agreement"])
        self.assertFalse(r["v3_freshness_verified"])
        self.assertFalse(r["detail_staging_authorized"])
        self.assertFalse(r["public_admission_authorized"])

    def test_feenway_mirror_still_unverified_even_with_origin_url_claim(self):
        for original in (None, ORI):
            r = compare_supplied_html({
                "source_url": FE, "raw_html": HTML, "origin_url": original
            }, as_of=AT)
            self.assertEqual(r["source_domain"], "feenway.com")
            self.assertEqual(r["origin_url_supplied"], original is not None)
            self.assertFalse(r["origin_url_verified"])
            self.assertFalse(r["detail_staging_authorized"])

    def test_no_bypass_of_invalid_web_urls_or_invented_status(self):
        for url in (
            "http://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810",
            "https://bad-agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810",
            "https://agenz.ma:444/fr/annonces/immo-rabat/vente-appartements/agdal/246810",
            "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/%32246810",
            "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810#bad",
        ):
            with self.subTest(url=url), self.assertRaises(DetailBenchmarkError):
                compare_supplied_html({"source_url": url, "raw_html": HTML}, as_of=AT)
        with self.assertRaises(DetailBenchmarkError):
            compare_supplied_html({"source_url": AG, "raw_html": HTML,
                                   "published_at": "2026-11-12"}, as_of=AT)

    def test_mubawab_encoded_unicode_slug_is_safe_and_ascii_escapes_rejected(self):
        ok = "https://www.mubawab.ma/fr/a/8449079/%C3%A0-vendre-%E2%80%93-bel-appartement-%C3%A0-hay-riad-rabat"
        res = compare_supplied_html({"source_url": ok, "raw_html": HTML}, as_of=AT)
        self.assertEqual(res["source_domain"], "mubawab.ma")
        for fragment in ("%2fadmin", "%2e%2e", "%25hack", "%ZZ", "%C3", "%E2%80%FF"):
            with self.subTest(fragment=fragment), self.assertRaises(DetailBenchmarkError):
                compare_supplied_html({
                    "source_url": "https://www.mubawab.ma/fr/a/8449079/" + fragment,
                    "raw_html": HTML}, as_of=AT)

    def test_missing_raw_html_cannot_pass_as_a_real_snapshot(self):
        for html in ("", "Appartement 850000 DH", None):
            with self.subTest(html=html), self.assertRaises(DetailBenchmarkError):
                compare_supplied_html({"source_url": AG, "raw_html": html}, as_of=AT)

    def test_duplicate_cases_fail_and_no_network_or_db(self):
        a = {"source_url": AG, "raw_html": HTML}
        with self.assertRaisesRegex(DetailBenchmarkError, "DUPLICATE_CASE_URL"):
            benchmark_supplied_cases([a, a], as_of=AT)
        summary = benchmark_supplied_cases([a, {"source_url": FE,
                                      "origin_url": ORI, "raw_html": HTML}], as_of=AT)
        self.assertEqual(summary["input_cases"], 2)
        self.assertEqual(summary["source_network_requests"], 0)
        self.assertEqual(summary["db_writes"], 0)
        self.assertEqual(summary["origin_urls_independently_verified"], 0)
        self.assertFalse(summary["detail_staging_authorized"])


if __name__ == "__main__":
    unittest.main()
