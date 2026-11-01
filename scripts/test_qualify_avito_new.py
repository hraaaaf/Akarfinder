import unittest

from qualify_avito_new import avito_id, discover, enrich_fields, normalize_result, result_for


class QualificationTests(unittest.TestCase):
    def test_extracts_id_from_avito_slug(self):
        self.assertEqual(avito_id("https://www.avito.ma/fr/x/listing_58824170.htm"), "58824170")
        self.assertIsNone(avito_id("https://example.com/listing.htm"))

    def test_result_does_not_call_http_200_active(self):
        r = result_for("https://www.avito.ma/fr/x/ad_58824170.htm", 200,
                       '<title>Flat 80m2 - 1 000 000 DH - Avito</title><meta property="og:description" content="Details">', None)
        self.assertEqual(r["availability"], "page_rendered_active_unconfirmed")
        self.assertFalse(r["completeness_sufficient"])
        self.assertEqual(r["commercial_reuse"], "not_verified_no_explicit_license_or_permission_found")

    def test_blocked_status_is_not_available(self):
        r = result_for("https://www.avito.ma/fr/x/ad_58824170.htm", 403, None, "HTTP 403")
        self.assertEqual(r["availability"], "non_verifiable")

    def test_recovers_visible_price_location_and_area_from_metadata(self):
        enriched = enrich_fields({"title": "Appartement 100 m2 - 6 500 DH - Appartements à louer à Casablanca",
                                  "description": "Appartement rénové avec balcon", "photos": []})
        self.assertEqual(enriched["price"], "6 500 DH")
        self.assertEqual(enriched["location"], "Casablanca")
        self.assertEqual(enriched["area"], "100 m²")
        result = normalize_result({"id": "12345678", "fields": enriched})
        self.assertTrue(result["completeness_sufficient"])

    def test_discovery_unique_net_new_ids(self):
        import tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as td:
            live, hist = Path(td) / "live.txt", Path(td) / "hist.txt"
            live.write_text("https://www.avito.ma/fr/a_11111111.htm\nhttps://www.avito.ma/fr/b_22222222.htm\nhttps://www.avito.ma/fr/c_22222222.htm\n", encoding="utf-8")
            hist.write_text("https://www.avito.ma/fr/old_11111111.htm\n", encoding="utf-8")
            self.assertEqual(discover(live, hist), [{"id": "22222222", "url": "https://www.avito.ma/fr/b_22222222.htm"}])


if __name__ == "__main__":
    unittest.main()
