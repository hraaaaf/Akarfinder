"""Synthetic capture-contract tests. No remote HTTP and no private source content."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import gzip
import json
import sys
import unittest
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import akarparser_v3_public_capture as c


def make_structured(path, urls):
    with gzip.open(path, "wt", encoding="utf-8") as stream:
        for url in urls:
            stream.write(json.dumps({"source": {"source_url": url}}) + "\n")


class FakeRobots:
    def can_fetch(self, agent, url):
        return True
    def crawl_delay(self, agent):
        return None


class CaptureContracts(unittest.TestCase):
    def test_url_scope_is_fail_closed_for_search_redirect_and_unsafe(self):
        self.assertEqual(c.fingerprint("https://domio.ma/fr/appartement/vendre/casablanca/1234/hero"),
                         ("domio.ma", "/fr/appartement/vendre/casablanca/1234/hero"))
        self.assertIsNone(c.fingerprint("https://mubawab.ma/fr/is/appartement_rabat_42"))
        self.assertIsNone(c.fingerprint("http://domio.ma/fr/appartement/vendre/casablanca/1234/hero"))
        self.assertIsNone(c.fingerprint("https://evil.example/fr/a/123/title"))
        self.assertIsNone(c.fingerprint("https://name:pass@domio.ma/fr/appartement/vendre/casablanca/1234/hero"))
        self.assertIsNone(c.fingerprint("https://domio.ma:8443/fr/appartement/vendre/casablanca/1234/hero"))

    def test_source_candidates_deduplicate_and_require_listing_routes(self):
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "source.jsonl.gz"
            url = "https://domio.ma/fr/appartement/vendre/casablanca/2345/hero"
            make_structured(path, [url, url + "?tag=example",
                                  "https://mubawab.ma/fr/is/search", "https://x.invalid/offer"])
            result = c.candidates_from_structured(path, set())
            self.assertEqual({key: list(value) for key, value in result.items()},
                             {"domio.ma": [url]})

    def test_batch_stores_capture_and_hash_without_product_database(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            input_path = root / "input.jsonl.gz"
            out = root / "new"
            url = "https://domio.ma/fr/appartement/vendre/casablanca/2345/hero"
            make_structured(input_path, [url])
            body = (b"<html><head><meta property='og:title' content='Annonce detail'></head>"
                    + b"<body><h1>Detail annonce</h1>" + b"x" * 1800 + b"</body></html>")
            with patch.object(c, "robots", return_value=FakeRobots()), \
                 patch.object(c, "fetch_detail", return_value=(body, url)), \
                 patch.object(c.time, "sleep") as paused:
                result = c.capture(input_path, root / "existing", out,
                                   max_new=1, max_per_domain=1)
            self.assertEqual(result["captured"], 1)
            self.assertEqual(result["safety"]["db_writes"], 0)
            paused.assert_called_once()
            pages = list(out.rglob("*.html"))
            self.assertEqual(len(pages), 1)
            meta = json.loads(Path(str(pages[0]) + ".meta.json").read_text("utf-8"))
            import hashlib
            self.assertEqual(meta["html_sha256"], hashlib.sha256(body).hexdigest())
            with self.assertRaises(FileExistsError):
                c.capture(input_path, root / "existing", out,
                          max_new=1, max_per_domain=1)

    def test_robot_denial_never_fetches_or_stores(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp);source = root / "source.jsonl.gz"
            make_structured(source, ["https://domio.ma/fr/appartement/vendre/casablanca/2345/hero"])
            class Reject(FakeRobots):
                def can_fetch(self, agent, url): return False
            with patch.object(c, "robots", return_value=Reject()), \
                 patch.object(c, "fetch_detail") as fetch:
                result = c.capture(source, root / "existing", root / "out",
                                   max_new=1, max_per_domain=1)
                fetch.assert_not_called()
            self.assertEqual(result["captured"], 0)
            self.assertEqual(result["errors"]["domio.ma"]["ROBOTS_DENIED"], 1)

    def test_429_stops_domain_without_retries(self):
        with TemporaryDirectory() as tmp:
            root=Path(tmp);source=root/"source.jsonl.gz"
            make_structured(source, [
                "https://domio.ma/fr/appartement/vendre/casablanca/2345/hero",
                "https://domio.ma/fr/appartement/vendre/casablanca/2346/hero"])
            error=HTTPError("https://domio.ma/irrelevant", 429, "rate limited", {}, None)
            with patch.object(c, "robots", return_value=FakeRobots()), \
                 patch.object(c, "fetch_detail", side_effect=error) as fetch, \
                 patch.object(c.time, "sleep"):
                result = c.capture(source, root/"existing", root/"out", max_new=2,max_per_domain=2)
            self.assertEqual(fetch.call_count, 1)
            self.assertEqual(result["captured"], 0)
            self.assertEqual(result["blocked_domains"], ["domio.ma"])

    def test_soft_404_http_200_is_not_a_capture(self):
        page = ("<html><head><title>Page introuvable - 404 - Barnes Marrakech</title>"
                "<meta property='og:title' content='Page introuvable - 404 - Barnes Marrakech'>"
                "</head><body>" + "not found " * 300 + "</body></html>")
        with self.assertRaisesRegex(ValueError, "SOFT_404_HTML"):
            c.check_detail_markup(page, "barnes-marrakech.com")

    def test_mouldar_generic_spa_is_not_a_listing(self):
        page = ("<html><head><title>Mouldar</title>"
                "<meta property='og:title' content='Mouldar'>"
                "</head><body><h1>Mouldar</h1>" + "app shell " * 300
                + "</body></html>")
        with self.assertRaisesRegex(ValueError, "GENERIC_APP_SHELL"):
            c.check_detail_markup(page, "mouldar.com")

    def test_structured_listing_detail_passes_markup_gate(self):
        page = ("<html><head><title>Appartement terrasse à vendre</title>"
                "<meta property='og:title' content='Appartement terrasse à vendre'>"
                "</head><body><script type='application/ld+json'>"
                '{"@type":"RealEstateListing","name":"Appartement terrasse"}'
                "</script><h1>Appartement terrasse à vendre</h1>"
                + "listing " * 250 + "</body></html>")
        c.check_detail_markup(page, "domio.ma")

    def test_delay_floor_never_reduced(self):
        with TemporaryDirectory() as tmp:
            root=Path(tmp);source=root/"source.jsonl.gz"
            make_structured(source,[])
            with self.assertRaises(ValueError):
                c.capture(source,root/"existing",root/"out",
                          max_new=1,max_per_domain=1,delay_seconds=2.5)
            self.assertFalse((root/"out").exists())


if __name__ == "__main__":
    unittest.main()
