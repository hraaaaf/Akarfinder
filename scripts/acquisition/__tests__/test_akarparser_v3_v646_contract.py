"""V646-to-V3 contract checks; synthetic, offline, no DB writes."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v3_v646_bridge import bridge_v646_row


def source(**changes):
    row = {
        "id": "12345678",
        "link": "https://www.mubawab.ma/fr/a/12345678/appartement-rabat",
        "title": "Appartement à vendre à Agdal",
        "location": "Rabat", "district": "Agdal",
        "property_type_observed": "apartment", "transaction_type": "sale",
        "price_mad": 1250000, "surface_m2": 95,
        "bedrooms": 2, "bathrooms": 1,
        "source_search_url": "https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre",
        "first_seen": "2026-11-12T15:00:00+00:00",
        "last_seen": "2026-11-12T15:10:00+00:00",
    }
    row.update(changes)
    return row


class V646Contract(unittest.TestCase):
    def test_fields_map_without_inventing_freshness(self):
        row = bridge_v646_row(source())
        self.assertEqual(row["source_offer_id"], "12345678")
        self.assertEqual(row["city"], "Rabat")
        self.assertEqual(row["district"], "Agdal")
        self.assertEqual(row["price_mad"], 1250000)
        self.assertEqual(row["surface_m2"], 95)
        self.assertEqual(row["transaction_type"], "sale")
        for key in ("observed_at", "fetched_at", "published_at"):
            self.assertNotIn(key, row)

    def test_identity_host_scheme_and_query_are_strict(self):
        for changes in (
            {"id": "99999999"},
            {"link": "https://evil.example/fr/a/12345678/x"},
            {"link": "http://www.mubawab.ma/fr/a/12345678/x"},
            {"link": "https://www.mubawab.ma/fr/a/12345678/x?fake=1"},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                bridge_v646_row(source(**changes))

    def test_rejects_unknown_sale_or_apartment_type(self):
        for changes in (
            {"transaction_type": None}, {"transaction_type": "rent"},
            {"property_type_observed": "apartment_probable"},
            {"property_type_observed": "villa"},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                bridge_v646_row(source(**changes))

    def test_actual_v3_receives_fields_without_freshness_clearance(self):
        import akarparser_v3_raw_bulk as v3
        record = v3.parse_raw(bridge_v646_row(source()),
                              datetime(2026, 11, 12, 16, tzinfo=timezone.utc))
        self.assertEqual(record["fields"]["city"], "Rabat")
        self.assertEqual(record["fields"]["district"], "Agdal")
        self.assertEqual(record["fields"]["price_mad"], 1250000)
        self.assertEqual(record["fields"]["surface_total_m2"], 95)
        self.assertEqual(record["quality"]["status"], "complete_requires_freshness")
        self.assertFalse(record["quality"]["freshness_independently_verified"])
        self.assertFalse(record["quality"]["availability_verified"])
        self.assertFalse(record["quality"]["neon_product_admission_authorized"])
