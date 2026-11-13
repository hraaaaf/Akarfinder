"""J6 negative admission gate over real V3 parser and Radar10 normalizer."""
from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v3_raw_bulk import parse_raw
from v7_parallel.j6_staging_readiness import review_batch

AT = datetime(2026, 11, 13, tzinfo=timezone.utc)


def agen_z(offer="445495", slug="sale-el-jadida"):
    url = f"https://agenz.ma/fr/annonces/immo-sale/vente-appartements/{slug}/{offer}"
    raw = {
        "source_url": url, "source_name": "agenz.ma",
        "source_offer_id": offer, "title": "Appartement à vendre",
        "city": "Salé", "district": "Salé El Jadida",
        "price_mad": 1650000, "surface_m2": 150,
        "property_type": "apartment", "transaction_type": "sale",
    }
    return parse_raw(raw, AT)


class PrivateStageGateTests(unittest.TestCase):
    def test_actual_v3_record_is_not_staged_without_proof(self):
        out = review_batch([agen_z()])
        self.assertEqual(out["observed"], 1)
        self.assertEqual(out["normalized_unique_identity"], 1)
        self.assertEqual(out["eligible_for_private_staging"], 0)
        self.assertFalse(out["publication_authorized"])
        self.assertEqual((out["source_http_requests"], out["db_reads"], out["db_writes"]), (0,0,0))
        self.assertIn("quarantine:INDEPENDENT_SOURCE_ADMISSION_GATE_MISSING", out["decision_counts"])

    def test_real_j3_conflict_id_forced_into_quarantine(self):
        out = review_batch([agen_z("444291", "al-qods")])
        self.assertEqual(out["decision_counts"].get("quarantine:J3_SOURCE_GEO_CONFLICT"), 1)

    def test_missing_original_html_is_not_staged(self):
        url = "https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/445495"
        out = review_batch([{"source_url": url, "source_offer_id": "445495"}])
        self.assertEqual(out["eligible_for_private_staging"], 0)
        self.assertEqual(out["normalized_unique_identity"], 0)
        self.assertIn("quarantine:V3_STRUCTURE_INVALID", out["decision_counts"])

    def test_untrusted_public_admission_flag_refused(self):
        row = agen_z()
        row["quality"]["neon_product_admission_authorized"] = True
        out = review_batch([row])
        self.assertIn("quarantine:V3_SAFETY_CONTRACT", out["decision_counts"])
        self.assertEqual(out["eligible_for_private_staging"], 0)

    def test_id_collision_same_portal_different_urls_aborts_batch(self):
        with self.assertRaisesRegex(ValueError, "J6_SOURCE_ID_COLLISION"):
            review_batch([agen_z("445495","sale-el-jadida"), agen_z("445495","al-qods")])

    def test_content_change_same_url_fails_closed(self):
        left = agen_z()
        right = agen_z()
        # Different data under the same portal/offer identity MUST not be
        # silently treated as two distinct source observations.
        right["fields"]["price_mad"] = 1000000
        with self.assertRaisesRegex(ValueError, "J6_CONTRADICTORY_CONTENT_FOR_URL"):
            review_batch([left, right])

    def test_identical_replay_deduplicated(self):
        row = agen_z()
        a = review_batch([row])
        b = review_batch([row, row])
        self.assertEqual(a["inventory_sha256"], b["inventory_sha256"])
        self.assertEqual(b["unique_payloads"], 1)
        self.assertEqual(b["decision_counts"]["duplicate_same_content"], 1)

    def test_wrong_batch_shape_fails(self):
        for bad in (None, {}, [None]*1001):
            with self.subTest(bad=type(bad).__name__):
                with self.assertRaisesRegex(ValueError, "J6_BATCH_BOUNDED_LIST_REQUIRED"):
                    review_batch(bad)

    def test_unsupported_origins_do_not_pass(self):
        row = agen_z()
        row["source"]["source_url"] = "https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319"
        out = review_batch([row])
        self.assertEqual(out["normalized_unique_identity"], 0)
        self.assertEqual(out["eligible_for_private_staging"], 0)
        self.assertIn("quarantine:SOURCE_HOST_OR_PATH_INVALID", out["decision_counts"])


if __name__ == "__main__":
    unittest.main()
