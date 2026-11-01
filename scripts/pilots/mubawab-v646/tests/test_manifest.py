import asyncio
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import akarfinder_scraper as s

class TestSourceManifest(unittest.TestCase):
    def setUp(self):
        self.file=tempfile.TemporaryDirectory()
        self.path=Path(self.file.name)/"urls.txt"
    def tearDown(self):
        self.file.cleanup()
    def test_default_only_verified_page(self):
        self.assertEqual(s.resolve_source_urls(1),[s.BASE_URL])
    def test_reject_colon_pagination_even_without_file(self):
        with self.assertRaisesRegex(ValueError,"pagination"):
            s.resolve_source_urls(2)
    def test_reject_direct_shard_with_colon(self):
        self.path.write_text(s.BASE_URL+":p:2\n")
        with self.assertRaisesRegex(ValueError,"non admissible"):
            s.resolve_source_urls(1,str(self.path))
    def test_reject_encoded_colon_and_other_domains(self):
        for url in ("https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre%3Ap%3A2", "https://x.mubawab.ma/fr/st/rabat/appartements-a-vendre", "http://www.mubawab.ma/fr/st/rabat/appartements-a-vendre", "https://www.mubawab.ma/fr/a/1234567/title", "https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre?n=1", "https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre#test"):
            with self.subTest(url=url):
                self.path.write_text(url+"\n")
                with self.assertRaises(ValueError):s.resolve_source_urls(1,str(self.path))
    def test_accept_three_safely_observed_shards(self):
        urls=(Path(__file__).parent.parent/"pilot-urls.txt").read_text().splitlines()
        self.assertEqual(s.resolve_source_urls(1,str(Path(__file__).parent.parent/"pilot-urls.txt")),urls)
    def test_reject_duplicate_and_excess(self):
        self.path.write_text(s.BASE_URL+"\n"+s.BASE_URL+"\n")
        with self.assertRaisesRegex(ValueError,"répétées"):s.resolve_source_urls(1,str(self.path))
        self.path.write_text((s.BASE_URL+"\n")*4)
        with self.assertRaises(ValueError):s.resolve_source_urls(1,str(self.path))
    def test_refuse_invalid_manifest_without_network_or_db(self):
        self.path.write_text(s.BASE_URL+":p:2\n")
        with patch.object(s,"gather_results",side_effect=AssertionError("network used")):
            with patch.object(s,"init_db",side_effect=AssertionError("DB written")):
                self.assertEqual(asyncio.run(s.main(pages=1,urls_file=str(self.path))),3)

if __name__=="__main__":unittest.main()
