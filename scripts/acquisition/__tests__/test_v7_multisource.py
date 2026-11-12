"""V7 multiple sources: real parser and isolated PostgreSQL, never LIVE."""
from datetime import datetime, timezone
import gzip
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import akarparser_v3_raw_bulk as v3
from radar10 import ingest, run_cycle
from v7_multisource.sources import (
    PORTALS, SOURCE_PRIORITY, SourceNotSupported, canonical_identity,
    bridge_agenz_record, bridge_multisource,
)
from v7_multisource.pipeline import prepare, read_individual_records

AT = datetime(2026, 11, 12, 17, tzinfo=timezone.utc)
V646_DIR = os.getenv("V646_OFFLINE_DIR", "")
TEST_DSN = os.getenv("RADAR_TEST_DSN", "")


def agenz(offer="246810", *, price=850000, slug="agdal"):
    return {
        "source_url": f"https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/{slug}/{offer}",
        "evidence_url": f"https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/{slug}/{offer}",
        "observation_kind": "individual_page",
        "source_offer_id": offer,
        "title": "Appartement a vendre, 90 m2",
        "city": "Rabat", "district": "Agdal",
        "property_type": "apartment", "transaction_type": "sale",
        "price_mad": price, "surface_m2": 90,
    }


def mubawab(offer="9961000"):
    return {
        "id": offer, "link": f"https://www.mubawab.ma/fr/a/{offer}/flat",
        "title": "Appartement à vendre", "location": "Rabat",
        "district": "Agdal", "price_mad": 1200000,
        "surface_m2": 100, "property_type_observed": "apartment",
        "transaction_type": "sale",
    }


class RegistryAndAdapterTests(unittest.TestCase):
    def test_explicit_inventory_not_confused_with_live_support(self):
        self.assertEqual(len(PORTALS), 11)
        self.assertEqual(tuple(PORTALS), SOURCE_PRIORITY)
        self.assertEqual(
            SOURCE_PRIORITY[:5],
            ("feenway.com", "agenz.ma", "avito.ma", "yakeey.com", "sarouty.ma"),
        )
        self.assertEqual(
            {x for x, v in PORTALS.items() if v["status"] == "offline_tested"},
            {"mubawab.ma", "agenz.ma"},
        )
        self.assertEqual(PORTALS["feenway.com"]["status"], "not_integrated")
        self.assertEqual(PORTALS["feenway.com"]["adapter"], "")
        self.assertEqual(PORTALS["avito.ma"]["status"], "not_integrated")

    def test_feenway_aggregator_remains_disabled_for_staging(self):
        with self.assertRaises(SourceNotSupported):
            bridge_multisource("feenway.com", {"source_url": "https://www.feenway.com/immobilier"})

    def test_agenz_normalizes_and_v3_guards_publication(self):
        row = bridge_agenz_record(agenz())
        self.assertEqual(row["source_url"], agenz()["source_url"])
        self.assertNotIn("published_at", row)
        parsed = v3.parse_raw(row, AT)
        self.assertIn(parsed["quality"]["status"], ("complete_requires_freshness", "partial",
                        "requires_manual_review"))
        self.assertFalse(parsed["quality"]["freshness_independently_verified"])
        self.assertFalse(parsed["quality"]["availability_verified"])
        self.assertFalse(parsed["quality"]["neon_product_admission_authorized"])
        normalized = ingest.normalize(parsed)
        self.assertEqual(normalized["source_domain"], "agenz.ma")
        self.assertEqual(normalized["source_offer_id"], "246810")
        self.assertEqual(normalized["price_mad"], 850000)
        self.assertEqual(normalized["city"], "Rabat")

    def test_aliases_and_cross_portal_identity(self):
        self.assertEqual(
            canonical_identity("https://www.agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810"),
            ("agenz.ma", "246810",
             "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810"),
        )
        self.assertEqual(canonical_identity("https://www.mubawab.ma/fr/a/9961000/flat")[0],
                         "mubawab.ma")

    def test_reject_host_port_query_search_urls_and_encoded_paths(self):
        urls = [
            "http://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810",
            "https://evil-agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810",
            "https://agenz.ma:444/fr/annonces/immo-rabat/vente-appartements/agdal/246810",
            "https://agenz.ma:/fr/annonces/immo-rabat/vente-appartements/agdal/246810",
            "https://agenz.ma/fr/acheter/vente-appartements",
            "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/%32246810",
            "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810?utm=1",
            "https://agenz.ma@evil.example/fr/annonces/immo-rabat/vente-appartements/agdal/246810",
        ]
        for url in urls:
            with self.subTest(url=url), self.assertRaises(SourceNotSupported):
                canonical_identity(url)

    def test_agenz_proof_id_transaction_time_fail_closed(self):
        edits = [
            lambda x: x.update(source_offer_id="another"),
            lambda x: x.update(evidence_url="https://example.org"),
            lambda x: x.update(observation_kind="serp"),
            lambda x: x.update(transaction_type="rent"),
            lambda x: x.update(published_at="2026-11-12T00:00:00Z"),
            lambda x: x.update(price_mad="850000"),
        ]
        for mutate in edits:
            record = agenz()
            mutate(record)
            with self.subTest(mutate=mutate), self.assertRaises(SourceNotSupported):
                bridge_agenz_record(record)
        with self.assertRaises(SourceNotSupported):
            bridge_multisource("avito.ma", agenz())

    def test_real_v3_batch_and_multi_site_staging_without_db(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "private"
            summary = prepare(signed_mubawab_rows=[mubawab()],
                              agenz_observations=[agenz()], private_root=root, at=AT)
            self.assertEqual(summary["observations_supplied"], 2)
            self.assertEqual(summary["unique_urls_supplied"], 2)
            self.assertEqual(summary["accepted"], 2)
            self.assertEqual(summary["sources"]["mubawab.ma"]["accepted"], 1)
            self.assertEqual(summary["sources"]["agenz.ma"]["accepted"], 1)
            self.assertEqual((summary["db_writes"], summary["network_requests"]), (0, 0))
            self.assertFalse(summary["public_admission_authorized"])
            with gzip.open(root / "v3" / "all.jsonl.gz", "rt", encoding="utf-8") as stream:
                rows = [json.loads(x) for x in stream if x.strip()]
            self.assertEqual(len(rows), 2)
            self.assertTrue(all(x["quality"]["availability_verified"] is False for x in rows))
            self.assertTrue(all(x["quality"]["freshness_independently_verified"] is False for x in rows))
            with self.assertRaises(ValueError):
                prepare(signed_mubawab_rows=[mubawab()],
                        agenz_observations=[agenz()], private_root=root, at=AT)

    def test_same_source_id_other_agenz_slug_is_quarantined_in_batch(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError, "SOURCE_ID_COLLISION"):
                prepare(agenz_observations=[agenz(), agenz(slug="different")],
                        private_root=Path(tmp) / "out", at=AT)

    def test_no_unknown_evidence_in_jsonl_feed(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "records.jsonl"
            src.write_text(json.dumps(agenz()) + "\n", encoding="utf-8")
            self.assertEqual(len(read_individual_records(src)), 1)
            with self.assertRaises(ValueError):
                read_individual_records(Path(tmp) / "absent.jsonl")


@unittest.skipUnless(V646_DIR, "Signed V646 fixture not checked out")
class V646ActualSignedToV7Tests(unittest.TestCase):
    def test_real_signed_v646_reader_to_v7_and_actual_v3(self):
        src = Path(V646_DIR).resolve()
        sys.path.insert(0, str(src))
        sys.path.insert(0, str(src / "tests"))
        from test_v646_round4_authenticated_snapshots import scratch, offline_main
        with scratch() as root:
            self.assertEqual(offline_main(), 0)
            for p in src.glob("*.py"):
                shutil.copy2(p, root / p.name)
            rows = run_cycle.verified_v646(root, collect=False)
            with tempfile.TemporaryDirectory() as tmp:
                result = prepare(signed_mubawab_rows=rows, agenz_observations=[agenz()],
                                 private_root=Path(tmp) / "out", at=AT)
            self.assertGreater(result["sources"]["mubawab.ma"]["accepted"], 0)
            self.assertEqual(result["sources"]["agenz.ma"]["accepted"], 1)
            self.assertEqual(result["db_writes"], 0)


@unittest.skipUnless(TEST_DSN, "Ephemeral PostgreSQL CI service not configured")
class MultiSourcePostgresTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import psycopg
        cls.conn = psycopg.connect(TEST_DSN, autocommit=True)
        cls.conn.execute(
            (HERE / "radar10" / "private_schema.sql").read_text(encoding="utf-8"))

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def setUp(self):
        self.conn.execute("TRUNCATE acquisition.radar_runs, acquisition.radar_candidates")

    def test_exactly_two_sources_staged_then_idempotent(self):
        rows = [
            ingest.normalize(v3.parse_raw(bridge_multisource("mubawab.ma", mubawab()), AT)),
            ingest.normalize(v3.parse_raw(bridge_multisource("agenz.ma", agenz()), AT)),
        ]
        audit = {"observed": 2, "rejected": {}}
        result = ingest.apply_batch(self.conn, rows, audit)
        self.assertEqual(result["inserted"], 2)
        self.assertEqual(ingest.apply_batch(self.conn, rows, audit)["unchanged"], 2)
        sources = self.conn.execute(
            "SELECT source_domain, count(*) FROM acquisition.radar_candidates "
            "GROUP BY source_domain ORDER BY source_domain").fetchall()
        self.assertEqual(sources, [("agenz.ma", 1), ("mubawab.ma", 1)])
        status = self.conn.execute(
            "SELECT DISTINCT publication_eligible,freshness_independently_verified "
            "FROM acquisition.radar_candidates").fetchall()
        self.assertEqual(status, [(False, False)])
        # Never touch public property listings or listing sources.
        self.assertIsNone(self.conn.execute(
            "SELECT to_regclass('public.property_listings')").fetchone()[0])


if __name__ == "__main__":
    unittest.main()
