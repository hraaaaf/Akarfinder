import asyncio
import hashlib
import json
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import akarfinder_scraper as s

ROBOTS = "User-agent: *\nDisallow: /login\nDisallow: /*:\nDisallow: /*?n=1\n"

class V646Safety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.manifest = Path(self.temp.name) / "urls.txt"
    def tearDown(self):
        self.temp.cleanup()
    def validate(self, url):
        self.manifest.write_text(url + "\n")
        return s.resolve_source_urls(1, str(self.manifest))
    def test_only_sale_and_apartment_category(self):
        for name in ("appartements-a-louer", "agences-immobilieres", "bureaux-a-vendre"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.validate("https://www.mubawab.ma/fr/st/rabat/" + name)
    def test_reject_untrusted_hosts_and_obfuscated_paths(self):
        for url in ("https://mubawab.ma/fr/st/rabat/appartements-a-vendre",
                    "https://x.mubawab.ma/fr/st/rabat/appartements-a-vendre",
                    "https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre%253Ap%253A2",
                    "https://www.mubawab.ma/fr/st/rabat/%2e%2e/appartements-a-vendre",
                    "https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre%2Fextra"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                self.validate(url)
    def test_three_existing_sale_pages_admitted(self):
        for url in (Path(__file__).parent.parent/"pilot-urls.txt").read_text().splitlines():
            self.assertEqual(self.validate(url), [url])
    def test_robots_wildcard_colon(self):
        rules = s._robots_rules(ROBOTS)
        self.assertFalse(s._robots_path_allowed("/fr/st/rabat/appartements-a-vendre:p:2", rules))
    def test_robot_disallow_change_halts(self):
        with self.assertRaises(ValueError):
            s.check_robots_policy([s.BASE_URL], "User-agent: *\nDisallow: /fr/st/\n")
    def test_robots_hash(self):
        p = s.check_robots_policy([s.BASE_URL], ROBOTS)
        self.assertEqual(p["sha256"], hashlib.sha256(ROBOTS.encode()).hexdigest())
    def test_robots_group_missing_fails_closed(self):
        with self.assertRaises(ValueError):
            s.check_robots_policy([s.BASE_URL], "User-agent: otherbot\nDisallow: /\n")
    def test_robots_unavailable_never_fetches_listings_or_writes_db(self):
        previous = os.getcwd()
        try:
            os.chdir(self.temp.name)
            with patch.object(s, "fetch_and_check_robots", side_effect=OSError("offline")), \
                 patch.object(s, "gather_results", side_effect=AssertionError("fetch")), \
                 patch.object(s, "init_db", side_effect=AssertionError("db")):
                self.assertEqual(asyncio.run(s.main(engine="http")), 3)
            self.assertEqual(json.loads(Path("robots_policy_evidence.json").read_text())["status"], "BLOCKED")
        finally:
            os.chdir(previous)
    def test_legacy_db_migrates_without_inventing_provenance(self):
        path = Path(self.temp.name)/"old.sqlite"
        with sqlite3.connect(path) as c:
            c.execute("CREATE TABLE listings(id TEXT PRIMARY KEY,title TEXT,price_mad INTEGER,link TEXT)")
            c.execute("INSERT INTO listings VALUES ('77777','Old',15000,'https://www.mubawab.ma/fr/a/77777/x')")
        c = s.init_db(str(path))
        self.assertEqual(tuple(c.execute("SELECT price_mad,source_search_url,transaction_type FROM listings WHERE id='77777'").fetchone()), (15000,None,None))
        c.close()
    def test_price_groups_do_not_mix_sale_and_rent(self):
        rows = []
        for i in range(8):
            rows.append({"id":str(i),"price_mad":1000000,"surface_m2":100,"location":"Rabat","transaction_type":"sale"})
            rows.append({"id":str(i+8),"price_mad":10000,"surface_m2":100,"location":"Rabat","transaction_type":"rent"})
        result = s.review_price_per_m2(rows)
        self.assertEqual(result["0"]["reference_median_price_per_m2_mad"],10000)
        self.assertEqual(result["8"]["reference_median_price_per_m2_mad"],100)
    def test_http_does_not_follow_redirects(self):
        class RedirectSession:
            async def get(self,url,**kwargs):
                self.kwargs=kwargs
                return type("Response", (), {"status_code":302,"text":""})()
        session=RedirectSession()
        with patch.object(s.asyncio,"sleep",new=__import__("unittest").mock.AsyncMock()):
            result=asyncio.run(s.fetch_page(session,s.BASE_URL,asyncio.Semaphore(1),max_retries=1))
        self.assertFalse(session.kwargs["allow_redirects"])
        self.assertEqual(result.status,"http_error")

    def test_explicit_rent_record_rejected(self):
        c=s.init_db(str(Path(self.temp.name)/"test.sqlite"))
        with self.assertRaisesRegex(ValueError, "non-sale"):
            s.import_listings(c, [{"id":"1","transaction_type":"rent"}])
        c.close()
if __name__ == "__main__":
    unittest.main()
