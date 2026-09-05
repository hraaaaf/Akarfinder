#!/usr/bin/env python3
import pathlib
import sys
import unittest

HERE = pathlib.Path(__file__).resolve()
sys.path.insert(0, str(HERE.parents[1]))

from avito_identity_guard import extract_avito_id, verify_avito_identity


class AvitoIdentityGuardTest(unittest.TestCase):
    def test_extracts_avito_id(self):
        url = "https://avito.ma/fr/harhoura/villas_et_riads/Belle_villa_58589037.htm"
        self.assertEqual(extract_avito_id(url), "58589037")

    def test_accepts_same_id_after_redirect(self):
        requested = "https://www.avito.ma/fr/oasis/appartements/Test_58589037.htm"
        final = "https://avito.ma/fr/oasis/appartements/Test_58589037.htm"
        verdict = verify_avito_identity(requested, final)
        self.assertTrue(verdict.identity_verified)
        self.assertEqual(verdict.reason, "same_listing_id_after_fetch")

    def test_rejects_catalog_redirect(self):
        requested = "https://avito.ma/fr/berrechid/villas_et_riads/Villa_55391819.htm"
        final = "https://avito.ma/fr/maroc/immobilier-a-vendre"
        verdict = verify_avito_identity(requested, final)
        self.assertFalse(verdict.identity_verified)
        self.assertEqual(verdict.reason, "redirected_away_from_detail_identity")

    def test_rejects_different_listing_id(self):
        requested = "https://avito.ma/fr/berrechid/villas_et_riads/Villa_55391819.htm"
        final = "https://avito.ma/fr/harhoura/villas_et_riads/Villa_56452893.htm"
        verdict = verify_avito_identity(requested, final)
        self.assertFalse(verdict.identity_verified)
        self.assertEqual(verdict.reason, "redirected_to_different_listing_id")

    def test_non_avito_is_neutral(self):
        verdict = verify_avito_identity(
            "https://example.com/property/1",
            "https://example.com/property/1",
        )
        self.assertTrue(verdict.identity_verified)
        self.assertEqual(verdict.reason, "not_avito")


if __name__ == "__main__":
    unittest.main()
