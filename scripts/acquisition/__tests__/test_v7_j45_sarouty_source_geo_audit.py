"""Source-only, synthetic regression for Sarouty JSON-LD geographic conflicts."""
from __future__ import annotations
import json
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_parallel.j45_sarouty_source_geo_audit import (
    audit_sarouty_source_geo, SaroutyGeoSourceRejected,
)

URL = "https://www.sarouty.ma/acheter/appartement-sale-bab-al-bahr-894012/"


def html(*, latitude=31.7948264, longitude=-7.0847231, locality="Sale",
         region="Bab al bahr", url=URL, count=1, with_geo=True):
    listing = {"@context": "https://schema.org",
               "@type": "RealEstateListing", "url": url,
               "address": {"@type": "PostalAddress", "addressLocality": locality,
                           "addressRegion": region}}
    if with_geo:
        listing["geo"] = {"latitude": latitude, "longitude": longitude}
    payload = "".join(
        '<script type="application/ld+json">'
        + json.dumps(listing, ensure_ascii=False) + "</script>"
        for _ in range(count)
    )
    return ('<!doctype html><html><head><title>Appartement</title>' +
            payload + '</head><body>Source uniquement</body></html>').encode("utf-8")


class SaroutySourceGeoTests(unittest.TestCase):
    def audit(self, raw=None):
        return audit_sarouty_source_geo(html() if raw is None else raw,
                                        expected_url=URL)

    def test_geopoint_far_from_source_reported_sale_quarantined(self):
        r=self.audit()
        self.assertEqual(r["status"], "jsonld_geo_far_from_reported_sale")
        self.assertGreater(r["distance_km_from_sale_city_reference"], 250)
        self.assertLess(r["distance_km_from_sale_city_reference"], 260)
        self.assertEqual(r["source_reported_neighborhood"], "Bab al bahr")
        self.assertFalse(r["independent_listing_location_verified"])
        self.assertFalse(r["eligible_for_geo_index"])
        self.assertFalse(r["eligible_for_private_detail_staging"])
        self.assertFalse(r["eligible_for_public_admission"])

    def test_nearby_source_coordinates_are_still_unverified(self):
        r=self.audit(html(latitude=34.05, longitude=-6.81))
        self.assertEqual(r["status"], "jsonld_geo_near_sale_not_independent_proof")
        self.assertFalse(r["eligible_for_geo_index"])

    def test_missing_geo_never_admitted(self):
        r=self.audit(html(with_geo=False))
        self.assertEqual(r["status"], "jsonld_no_valid_coordinates")
        self.assertIsNone(r["distance_km_from_sale_city_reference"])

    def test_different_city_outside_scope_no_fabricated_sale_distance(self):
        r=self.audit(html(locality="Rabat"))
        self.assertEqual(r["status"], "jsonld_city_outside_review_scope")
        self.assertIsNone(r["distance_km_from_sale_city_reference"])
        self.assertFalse(r["eligible_for_geo_index"])

    def test_jsonld_identity_mismatch_rejected(self):
        with self.assertRaisesRegex(SaroutyGeoSourceRejected, "SOURCE_JSONLD_URL_MISMATCH"):
            self.audit(html(url=URL.replace("894012", "894013")))

    def test_duplicate_listing_not_accepted(self):
        with self.assertRaisesRegex(SaroutyGeoSourceRejected, "ONE_REAL_ESTATE_LISTING"):
            self.audit(html(count=2))

    def test_no_listing_claim_not_accepted(self):
        with self.assertRaisesRegex(SaroutyGeoSourceRejected, "ONE_REAL_ESTATE_LISTING"):
            self.audit(b"<!doctype html><html><title>Nothing</title></html>")

    def test_invalid_latitude_and_boolean_rejected(self):
        for val in (91, True, "nan", "oops"):
            with self.subTest(value=str(val)):
                with self.assertRaisesRegex(SaroutyGeoSourceRejected,
                                            "JSONLD_COORDINATES_INVALID"):
                    self.audit(html(latitude=val))

    def test_url_and_bytes_fail_closed(self):
        with self.assertRaisesRegex(SaroutyGeoSourceRejected, "EXACT_SAROUTY_DETAIL_URL"):
            audit_sarouty_source_geo(html(), expected_url="https://other.example/894012")
        with self.assertRaisesRegex(SaroutyGeoSourceRejected, "BOUNDED_ORIGINAL_HTML"):
            self.audit(b"")
        with self.assertRaisesRegex(SaroutyGeoSourceRejected, "BOUNDED_ORIGINAL_HTML"):
            self.audit(b"x" * 2_000_001)

    def test_no_source_http_and_no_db(self):
        result=self.audit()
        self.assertEqual((result["source_http_requests"], result["db_writes"]), (0,0))


if __name__ == "__main__":
    unittest.main()
