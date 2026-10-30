import tempfile,unittest,urllib.error
from pathlib import Path
from unittest.mock import patch
import collector as m
ROBOTS="User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /resultats\nSitemap: https://kaynly.com/landings/sitemap.xml\n"
SITEMAP=b'<urlset><url><loc>https://kaynly.com/vente/casablanca</loc></url><url><loc>https://kaynly.com/location/rabat</loc></url><url><loc>https://kaynly.com/resultats</loc></url></urlset>'
HTML=b'<a href="https://www.mubawab.ma/fr/a/8444113/flat">A</a><a href="https://www.avito.ma/fr/maarif/appartements/flat_58966001.htm">B</a><a href="https://www.sarouty.ma/acheter/flat-908924.html">C</a><a href="https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319">D</a><a href="https://nouraimmobilier.ma/property/apartment">E</a>'
class Tests(unittest.TestCase):
 def test_robots(self):
    f=m.guard(ROBOTS)
    self.assertTrue(f("https://kaynly.com/vente/rabat"))
    self.assertFalse(f("https://kaynly.com/resultats?ville=Casa"))
    self.assertFalse(f("https://kaynly.com/api/fetch"))
 def test_robots_change_fails(self):
    with self.assertRaises(ValueError):m.guard(ROBOTS.replace("Disallow: /resultats",""))
 def test_sitemap(self):
    self.assertEqual(len(m.parse_sitemap(SITEMAP)),2)
 def test_extract(self):
    self.assertEqual(len(m.extract(HTML.decode(),m.SITE)),5)
    self.assertIsNone(m.original("https://evil.example/fr/a/8444113/a"))
    self.assertIsNone(m.original("http://www.mubawab.ma/fr/a/8444113/a"))
 def test_budgets(self):
    with self.assertRaises(ValueError):m.collect(Path("."),121)
 def test_integration(self):
    def fake(url,cap=2_000_000):
        if url==m.ROBOT:return ROBOTS.encode()
        if url==m.SITEMAP:return SITEMAP
        return HTML
    with tempfile.TemporaryDirectory() as d,patch.object(m,"fetch",side_effect=fake),patch.object(m.time,"sleep"):
        r=m.collect(Path(d),max_pages=2)
        self.assertEqual(r["unique_source_ids"],5)
        self.assertEqual(r["provenance_edges"],10)
        self.assertEqual(r["pages_successful"],2)
 def test_rate_limit(self):
    def fake(url,cap=2_000_000):
        if url==m.ROBOT:return ROBOTS.encode()
        if url==m.SITEMAP:return SITEMAP
        raise urllib.error.HTTPError(url,429,"limit",{},None)
    with tempfile.TemporaryDirectory() as d,patch.object(m,"fetch",side_effect=fake),patch.object(m.time,"sleep"):
        self.assertEqual(m.collect(Path(d),max_pages=2)["stop_reason"],"access_refused")
if __name__=="__main__":unittest.main()
