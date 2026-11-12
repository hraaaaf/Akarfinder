"""Q1F: observation IDs must survive parser corrections on the same raw capture."""
from datetime import datetime, timezone
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import akarparser_v3_raw_bulk as v3

CLOCK = datetime(2026, 11, 10, 11, tzinfo=timezone.utc)
URL = "https://domio.ma/fr/appartement/vendre/casablanca/test-offer"


def snapshot(html, source_url=URL):
    return {"raw_html": html, "source_url": source_url,
            "fetched_at": "2026-11-09T15:40:00Z"}


class StableIdentity(unittest.TestCase):
    def test_snapshot_fallback_ignores_extracted_field_changes(self):
        a = {"record_id": "observation-aaaa", "source": {
            "identity_state": "missing", "domain": "domio.ma", "source_offer_id": None},
            "extracted": {"observed_at": "2026-11-09T15:40:00+00:00"}}
        b = {"record_id": "observation-bbbb", "source": dict(a["source"]),
            "extracted": dict(a["extracted"])}
        id_a, scheme_a = v3.stable_observation_id("1" * 64, a)
        id_b, scheme_b = v3.stable_observation_id("1" * 64, b)
        self.assertEqual(id_a, id_b)
        self.assertEqual(scheme_a, scheme_b)
        self.assertEqual(scheme_a, "v3_capture_sha256")
        self.assertNotEqual(id_a, a["record_id"])

    def test_distinct_raw_capture_hashes_get_distinct_ids(self):
        base = {"record_id": "old", "source": {"identity_state": "missing",
                "domain": "domio.ma", "source_offer_id": None},
                "extracted": {"observed_at": "2026-11-09T15:40:00+00:00"}}
        a = v3.stable_observation_id("a" * 64, base)
        b = v3.stable_observation_id("b" * 64, base)
        self.assertNotEqual(a[0], b[0])

    def test_keep_source_backed_id(self):
        base = {"record_id": "observation-original", "source": {
            "identity_state": "url_candidate", "domain": "mubawab.ma",
            "source_offer_id": "930001"},
            "extracted": {"observed_at": "2026-11-09T15:40:00+00:00"}}
        self.assertEqual(v3.stable_observation_id("a" * 64, base),
                         ("observation-original", "v2_source_id_observation"))

    def test_same_raw_with_different_clock_is_same_id(self):
        raw = snapshot("<html><body>Appartement quartier Belvédère, Casablanca.</body></html>")
        a = v3.parse_raw(raw, CLOCK)
        b = v3.parse_raw(raw, datetime(2026, 11, 11, tzinfo=timezone.utc))
        self.assertEqual(a["record_id"], b["record_id"])
        self.assertEqual(a["record_id_scheme"], "v3_capture_sha256")
        self.assertEqual(a["raw_sha256"], b["raw_sha256"])
        self.assertFalse(a["quality"]["neon_product_admission_authorized"])

    def test_reparse_with_changed_district_extraction_keeps_id(self):
        raw = snapshot("<html><body>Appartement Casablanca</body></html>")

        def parse_with_district(district):
            def enrich(page, row, evidence):
                row["district"] = district
                evidence["district"] = {"path": "synthetic.location"}
            with patch.object(v3.portals, "enrich", side_effect=enrich):
                return v3.parse_raw(raw, CLOCK)

        a = parse_with_district("Titre publicitaire incorrect")
        b = parse_with_district("Belvédère")
        self.assertNotEqual(a["fields"]["district"], b["fields"]["district"])
        self.assertEqual(a["raw_sha256"], b["raw_sha256"])
        self.assertEqual(a["record_id"], b["record_id"])
        self.assertEqual(b["record_id_scheme"], "v3_capture_sha256")

    def test_html_update_produces_distinct_snapshot_id(self):
        a = v3.parse_raw(snapshot("<html>Quartier Belvédère</html>"), CLOCK)
        b = v3.parse_raw(snapshot("<html>Quartier Maârif</html>"), CLOCK)
        self.assertNotEqual(a["record_id"], b["record_id"])

    def test_source_url_without_capture_date_still_stable(self):
        raw = {"raw_html": "<html>Terrain Casablanca</html>",
               "source_url": URL}
        a = v3.parse_raw(raw, CLOCK)
        b = v3.parse_raw(raw, CLOCK)
        self.assertEqual(a["record_id"], b["record_id"])
        self.assertEqual(a["record_id_scheme"], "v3_capture_sha256")
        self.assertFalse(b["quality"]["neon_product_admission_authorized"])

    def test_missing_source_id_does_not_alias_another_url(self):
        body = "<html><body>Appartement Casablanca</body></html>"
        a = v3.parse_raw(snapshot(body, "https://domio.ma/offre/one"), CLOCK)
        b = v3.parse_raw(snapshot(body, "https://domio.ma/offre/two"), CLOCK)
        self.assertNotEqual(a["record_id"], b["record_id"])


if __name__ == "__main__":
    unittest.main()
