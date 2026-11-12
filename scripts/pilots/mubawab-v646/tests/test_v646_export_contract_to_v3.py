"""Offline V646 producer-side contract for downstream V3 consumption.

All data is synthetic from the existing authenticated V646 offline fixture.
No network, Supabase, crawl, publication approval, or deployment.
"""
import json
import unittest

import akarfinder_scraper as s
from test_v646_round4_authenticated_snapshots import scratch, offline_main


class V646VerifiedExportContract(unittest.TestCase):
    def test_authenticated_export_preserves_fields_needed_by_v3_bridge(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            with s.read_verified_publication() as publication:
                rows = json.loads(publication.read_export("akarfinder_data.json"))
                self.assertGreater(len(rows), 0)
                for row in rows:
                    for field in ("id", "link", "title", "location", "district",
                                  "property_type_observed", "transaction_type",
                                  "price_mad", "surface_m2", "first_seen", "last_seen"):
                        self.assertIn(field, row)
                    self.assertEqual(row["transaction_type"], "sale")
                    self.assertEqual(row["property_type_observed"], "apartment")
                    # These are observations, not a verified publication date.
                    self.assertNotIn("observed_at", row)
                    self.assertNotIn("published_at", row)
                self.assertEqual(
                    publication.db.execute("SELECT count(*) FROM listings").fetchone()[0],
                    len(rows)
                )
