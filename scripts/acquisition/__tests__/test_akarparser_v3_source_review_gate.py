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

    def test_original_conflict_detected_without_v7_reason(self):
        raw = row()
        raw["raw_html"] = ('<html><main>'
            '<section><h2>Coût mensuel</h2><p>Loyer mensuel 7 500 DH / mois</p></section>'
            '<section><h2>Description</h2><p>Location longue durée : 7 700 DH / mois</p></section>'
            '<section><h2>Caractéristiques</h2><ul><li>Surface84 m²</li></ul></section>'
            '</main></html>')
        result = parse_raw(raw, NOW)
        self.assertEqual(result["quality"]["status"], "requires_manual_review")
        self.assertIn(REASON, result["quality"]["review_reasons"])
        self.assertEqual(result["fields"]["price_mad"], 7500)
        self.assertFalse(result["quality"]["availability_verified"])

    def test_recommendation_price_is_not_primary_conflict(self):
        raw = row()
        raw["raw_html"] = ('<html><main>'
            '<section><h2>Coût mensuel</h2><p>Loyer mensuel 7 500 DH</p></section>'
            '<section><h2>Description</h2><p>Appartement propre</p></section>'
            '<section><h2>Caractéristiques</h2><ul><li>Surface84 m²</li></ul></section>'
            '<section><h2>Annonces similaires</h2><p>7 700 DH</p></section>'
            '</main></html>')
        self.assertNotIn(REASON, parse_raw(raw, NOW)["quality"]["review_reasons"])

    def test_scoped_matching_prices_do_not_invent_conflict(self):
        raw = row()
        raw["raw_html"] = ('<html><main>'
            '<section><h2>Coût mensuel</h2><p>Loyer mensuel 7 500 DH</p></section>'
            '<section><h2>Description</h2><p>Location longue durée : 7 500 DH / mois</p></section>'
            '<section><h2>Caractéristiques</h2><ul><li>Surface84 m²</li></ul></section>'
            '</main></html>')
        self.assertNotIn(REASON, parse_raw(raw, NOW)["quality"]["review_reasons"])

    def test_canonical_mismatch_requires_review(self):
        raw = row()
        raw["raw_html"] = ('<html><head><link rel="canonical" '
            'href="https://agenz.ma/fr/annonces/another/999">'
            '</head><body><main>Appartement</main></body></html>')
        result = parse_raw(raw, NOW)
        self.assertIn("HTML_SOURCE_IDENTITY_MISMATCH_REQUIRES_REVIEW",
                      result["quality"]["review_reasons"])
        self.assertEqual(result["quality"]["status"], "requires_manual_review")
        self.assertFalse(result["quality"]["neon_product_admission_authorized"])

    def test_matching_canonical_slash_and_query_is_not_conflict(self):
        raw = row(url=SOURCE + "?utm_source=qa")
        raw["raw_html"] = ('<html><head><link rel="canonical" href="' + SOURCE + '/">'
            '<meta property="og:url" content="' + SOURCE + '">'
            '</head><body><main>Appartement</main></body></html>')
        self.assertNotIn("HTML_SOURCE_IDENTITY_MISMATCH_REQUIRES_REVIEW",
            parse_raw(raw, NOW)["quality"]["review_reasons"])

    def test_canonical_and_og_disagreement_requires_review(self):
        raw = row()
        raw["raw_html"] = ('<html><head><link rel="canonical" href="' + SOURCE + '">'
            '<meta property="og:url" content="https://agenz.ma/fr/annonces/fake/999">'
            '</head><body><main>Appartement</main></body></html>')
        self.assertIn("HTML_SOURCE_IDENTITY_MISMATCH_REQUIRES_REVIEW",
            parse_raw(raw, NOW)["quality"]["review_reasons"])

    def test_unscoped_html_price_not_internally_ready(self):
        raw = row(url="https://example.test/fiche/99")
        raw.pop("price_mad")
        raw["raw_html"] = ('<html><body><h1>Appartement</h1>'
                           '<aside>Biens similaires : 9 900 DH</aside></body></html>')
        result = parse_raw(raw, NOW)
        self.assertIn("UNSCOPED_HTML_NUMERIC_FIELD_REQUIRES_REVIEW",
                      result["quality"]["review_reasons"])
        self.assertTrue(result["quality"]["human_review_required"])
        self.assertNotEqual(result["quality"]["status"], "ready_internal")

    def test_stale_complete_with_conflict_is_in_review_bucket(self):
        raw = row()
        raw["observed_at"] = "2026-09-01T10:00:00Z"
        raw["raw_html"] = ('<html><head><link rel="canonical" '
            'href="https://agenz.ma/fr/annonces/mismatch/999">'
            '</head><body><main>Appartement</main></body></html>')
        result = parse_raw(raw, NOW)
        self.assertEqual(result["quality"]["status"], "requires_manual_review")
        self.assertEqual(result["quality"]["freshness_status"], "aging_claimed")
        self.assertFalse(result["quality"]["freshness_independently_verified"])

if __name__ == "__main__":
    unittest.main()
