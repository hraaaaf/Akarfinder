"""P1 regression tests. Synthetic HTML ONLY; baseline from verified one-shot 2026-11-03."""
import asyncio
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import akarfinder_scraper as s
import benchmark_evidence as ev
import live_canary
from test_parser_evidence import card


def page(n, title="Appartement à vendre", district="Agdal, Rabat", modern=True):
    return "<html><body>" + "".join(
        card(9100000+i, title=title, district=district, modern=modern) for i in range(n)
    ) + "</body></html>"


class P1Baselines(unittest.TestCase):
    def test_baselines_pin_the_three_verified_shards_without_inference(self):
        path = Path(s.__file__).with_name("quality_baselines_v646_20261103.json")
        proof = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(proof["reference_live_run"], 41730963403)
        self.assertEqual(proof["minimum_coverage_ratio"], 0.70)
        urls = s.resolve_source_urls(1, str(Path(s.__file__).with_name("pilot-urls.txt")))
        self.assertEqual([s.approved_shard_baseline(url) for url in urls], [32, 32, 33])

    def test_unapproved_shard_has_no_baseline(self):
        with self.assertRaisesRegex(ValueError, "Missing approved"):
            s.approved_shard_baseline("https://www.mubawab.ma/fr/st/tanger/appartements-a-vendre")

    def test_invalid_baseline_fails_closed(self):
        for bad in (0, -1, True, 1.5, "32"):
            with self.subTest(value=bad), self.assertRaises(ValueError):
                s.parse_listings_audited(page(32), baseline_eligible_cards=bad)

    def test_main_refuses_unapproved_shard_without_site_or_database(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp)/"other-shard.txt"
            f.write_text("https://www.mubawab.ma/fr/st/tanger/appartements-a-vendre\n")
            with patch.object(s, "fetch_and_check_robots") as robots, \
                 patch.object(s, "gather_results") as gather, \
                 patch.object(s, "init_db") as database:
                self.assertEqual(asyncio.run(s.main(engine="browser", urls_file=str(f))), 3)
            robots.assert_not_called()
            gather.assert_not_called()
            database.assert_not_called()


class P1Truncation(unittest.TestCase):
    def test_17_eligible_all_correct_still_fails_against_32_card_baseline(self):
        a = s.parse_listings_audited(page(17), baseline_eligible_cards=32, require_locality=True)
        self.assertEqual((len(a.listings), a.eligible_cards, a.acceptance_rate), (17,17,1.0))
        self.assertFalse(a.passes_quality)
        self.assertIn("below_shard_baseline_provisional", a.quality_reasons)

    def test_provisional_threshold_boundary(self):
        for count, expected in ((22,False),(23,True),(32,True),(33,True)):
            with self.subTest(count=count):
                a = s.parse_listings_audited(page(count), baseline_eligible_cards=32, require_locality=True)
                self.assertEqual(a.passes_quality, expected)

    def test_rejected_canary_has_observed_counts_but_no_accepted_counts(self):
        a = live_canary.summarise_html(page(12), baseline_eligible_cards=32, require_locality=True)
        self.assertFalse(a["quality_accepted"])
        self.assertEqual(a["counts_observed"]["unique_source_ids"],12)
        self.assertIsNone(a["counts_for_accepted_page_only"])
        self.assertEqual(a["quality_contract"]["baseline_eligible_cards"], 32)
        self.assertIn("below_shard_baseline_provisional",a["quality_reasons"])


class P1Locality(unittest.TestCase):
    def test_both_modern_css_markers_drift_and_strict_gate_still_refuses(self):
        html = page(10).replace('class="listingTit"', 'class="listingTitle"').replace(
            'class="listingH3"', 'class="renamed"')
        self.assertTrue(s.parse_listings_audited(html).passes_quality)
        strict = s.parse_listings_audited(html, require_locality=True)
        self.assertEqual(strict.locality_coverage, 0)
        self.assertFalse(strict.passes_quality)
        self.assertIn("locality_coverage_below_threshold",strict.quality_reasons)

    def test_strict_gate_does_not_invent_location(self):
        a = s.parse_listings_audited(page(10,district=""),require_locality=True)
        self.assertTrue(all(row["location"] is None and row["district"] is None for row in a.listings))
        self.assertFalse(a.passes_quality)

    def test_legacy_compatibility_is_not_strict_completeness(self):
        html = page(3, modern=False)
        self.assertTrue(s.parse_listings_audited(html).passes_quality)
        self.assertFalse(s.parse_listings_audited(html, require_locality=True).passes_quality)
        self.assertEqual(ev.evaluate(s.parse_listings(html))["complete_core_with_district"],0)


class P1ObservedTypes(unittest.TestCase):
    def test_title_only_type_rules(self):
        cases = {
            "Appartement à vendre":"apartment",
            "Studio ensoleillé":"apartment",
            "Duplex en vente":"apartment",
            "Appartement avec bureau":"apartment",
            "Villa à vendre":"villa",
            "Terrain titré":"land",
            "Bureau à vendre":"office",
            "Cabinet médical":"office",
            "Magasin en vente":"shop",
            "Villa avec appartement":"mixed_ambiguous",
            "Bureau avec studio":"mixed_ambiguous",
            "3 chambres":"apartment_probable",
            "Opportunité à saisir":"unknown",
        }
        for title,expected in cases.items():
            with self.subTest(title=title):
                self.assertEqual(s.classify_property_type(title), expected)

    def test_property_type_metric_never_assumes_from_shard(self):
        titles = ["Appartement avec bureau","Villa à vendre","Terrain titré","Cabinet médical"]
        html = "".join(card(9300000+i,title=t) for i,t in enumerate(titles))
        rows = s.parse_listings(html)
        self.assertEqual([r["property_type_observed"] for r in rows],
                         ["apartment","villa","land","office"])
        counts = ev.evaluate(rows)
        self.assertEqual(counts["apartment_confirmed_from_title_only"],1)
        self.assertEqual(counts["explicit_other_or_mixed_type_from_title_only"],3)
        self.assertEqual(counts["property_type_observed_counts"],{
            "apartment":1,"land":1,"office":1,"villa":1})
        self.assertEqual(ev.evaluate([{"id":"9300099"}])["apartment_confirmed_from_title_only"],0)

    def test_legacy_db_migration_and_type_change_journal(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"old.db"
            with sqlite3.connect(path) as c:
                c.execute("CREATE TABLE listings(id TEXT PRIMARY KEY,title TEXT,price_mad INTEGER,link TEXT)")
                c.execute("INSERT INTO listings VALUES ('77777','Old',100000,'https://www.mubawab.ma/fr/a/77777/x')")
            c.close()
            db=s.init_db(str(path))
            try:
                self.assertIsNone(db.execute("SELECT property_type_observed FROM listings WHERE id='77777'").fetchone()[0])
                new=s.parse_listings(card(9300010,title="Villa à vendre"))
                for r in new:r["transaction_type"]="sale"
                s.import_listings(db,new)
                self.assertEqual(db.execute("SELECT property_type_observed FROM listings WHERE id='9300010'").fetchone()[0],"villa")
                newer=s.parse_listings(card(9300010,title="Appartement à vendre"))
                for r in newer:r["transaction_type"]="sale"
                stats,_=s.import_listings(db,newer)
                self.assertEqual(stats.field_changes.get("property_type_observed"),1)
                self.assertEqual(tuple(db.execute("SELECT old_value,new_value FROM field_change_log WHERE field='property_type_observed'").fetchone()),("villa","apartment"))
            finally:
                db.close()



class ChallengeOverlayGate(unittest.TestCase):
    def test_visible_challenge_heading_blocks_even_with_usable_listing_cards(self):
        html = (
            "<html><head><title>Annonces immobilières</title></head><body>"
            + card(9190001) +
            "<h1>Checking your browser before accessing</h1></body></html>"
        )
        audit = s.parse_listings_audited(html, require_locality=True)
        self.assertTrue(s.looks_like_block_page(html))
        self.assertFalse(audit.passes_quality)
        self.assertEqual(audit.listings, [])
        self.assertEqual(audit.rejected, {"challenge_page": 1})

    def test_alert_verify_human_blocks_residual_cards(self):
        html = (
            "<html><body>" + card(9190002)
            + "<div role='alert'>Verify you are human</div></body></html>"
        )
        self.assertTrue(s.looks_like_block_page(html))
        self.assertEqual(s.parse_listings(html), [])

    def test_incidental_challenge_words_in_listing_description_are_not_block_page(self):
        html = (
            "<html><body>" + card(9190003)
            + "<p>Le logement inclut un livre intitulé Just a Moment.</p>"
            + "</body></html>"
        )
        self.assertFalse(s.looks_like_block_page(html))
        self.assertEqual(len(s.parse_listings(html)), 1)



if __name__=="__main__":
    unittest.main()
