"""AkarParser V3 source-evidence review gate (offline): NEVER upgrades listing."""
from datetime import datetime, timezone
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v3_raw_bulk import parse_raw

NOW = datetime(2026, 11, 13, 15, tzinfo=timezone.utc)
SOURCE = "https://agenz.ma/fr/annonces/immo-marrakech/location-appartements/route-de-casablanca/169490"
REASON = "AGENZ_PRIMARY_VS_DESCRIPTION_RENT_PRICE_CONFLICT"

def row(url=SOURCE, with_html=True):
    out = {
        "source_url": url, "title": "Appartement à louer Marrakech",
        "city": "Marrakech", "district": "Route de Casablanca",
        "price_mad": 7500, "surface_m2": 84,
        "transaction_type": "rent", "property_type": "apartment",
        "observed_at": NOW.isoformat()
    }
    if with_html:
        out["raw_html"] = ("<!doctype html><html><head><title>Appartement à louer</title></head>"
                            "<body><main><h1>Appartement à louer</h1></main></body></html>")
    return out

class TrustedV7ReviewGateTests(unittest.TestCase):
    def test_agenz_source_conflict_forces_v3_review_bucket(self):
        r = parse_raw(row(), NOW, source_review_reasons=(REASON,))
        self.assertEqual(r["quality"]["status"], "requires_manual_review")
        self.assertTrue(r["quality"]["human_review_required"])
        self.assertEqual(r["quality"]["review_reasons"], [REASON])
        self.assertFalse(r["quality"]["neon_product_admission_authorized"])
        self.assertEqual(r["fields"]["price_mad"], 7500)
        self.assertEqual(r["fields"]["surface_total_m2"], 84)
    def test_default_parse_unchanged_without_verified_source_reason(self):
        r = parse_raw(row(), NOW)
        self.assertFalse(r["quality"]["human_review_required"])
        self.assertNotIn(REASON, r["quality"]["review_reasons"])
    def test_unknown_review_reason_rejected(self):
        with self.assertRaisesRegex(ValueError, "INVALID_SOURCE_REVIEW_REASONS"):
            parse_raw(row(), NOW, source_review_reasons=("FAKE_APPROVAL",))
    def test_list_input_rejected(self):
        with self.assertRaisesRegex(ValueError, "INVALID_SOURCE_REVIEW_REASONS"):
            parse_raw(row(), NOW, source_review_reasons=[REASON])
    def test_cross_source_review_reason_rejected(self):
        with self.assertRaisesRegex(ValueError, "SOURCE_REVIEW_WRONG_ORIGIN"):
            parse_raw(row("https://www.mubawab.ma/fr/a/8423416/terrain"), NOW,
                      source_review_reasons=(REASON,))
    def test_html_required_for_original_source_reason(self):
        with self.assertRaisesRegex(ValueError, "SOURCE_REVIEW_WRONG_ORIGIN"):
            parse_raw(row(with_html=False), NOW, source_review_reasons=(REASON,))
    def test_no_duplicate_reason_in_v3_output(self):
        r = parse_raw(row(), NOW, source_review_reasons=(REASON, REASON))
        self.assertEqual(r["quality"]["review_reasons"].count(REASON), 1)
        self.assertEqual(r["quality"]["status"], "requires_manual_review")

if __name__ == "__main__":
    unittest.main()
