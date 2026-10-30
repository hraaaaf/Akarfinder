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

 def test_balanced_selection_excludes_first_60_and_splits_transaction(self):
    first=[f"https://kaynly.com/location/old-{i}" for i in range(60)]
    sale=[f"https://kaynly.com/vente/city-{i}/appartements" for i in range(38)]
    rent=[f"https://kaynly.com/location/city-{i}/appartements" for i in range(38)]
    pool=first+sale+rent
    selected=m.select_pages(pool,60,"balanced-new")
    self.assertEqual(len(selected),60)
    self.assertEqual(len(set(selected)),60)
    self.assertFalse(set(first)&set(selected))
    self.assertEqual(sum("/vente/" in x for x in selected),30)
    self.assertEqual(sum("/location/" in x for x in selected),30)
    self.assertGreaterEqual(len({x.split("/")[4] for x in selected}),30)
    self.assertTrue("/vente/" in selected[0] and "/location/" in selected[1])
 def test_balanced_selection_handles_partial_category_without_repeat(self):
    first=[f"https://kaynly.com/location/old-{i}" for i in range(60)]
    sale=[f"https://kaynly.com/vente/new-{i}/villas" for i in range(3)]
    rent=[f"https://kaynly.com/location/new-{i}/villas" for i in range(70)]
    selected=m.select_pages(first+sale+rent,60,"balanced-new")
    self.assertEqual(len(selected),60)
    self.assertEqual(len(set(selected)),60)
    self.assertEqual(sum("/vente/" in x for x in selected),3)
    self.assertEqual(sum("/location/" in x for x in selected),57)
 def test_balanced_run_records_distinct_sampling_provenance(self):
    old=[f"https://kaynly.com/location/old-{i}" for i in range(60)]
    extra=[f"https://kaynly.com/{kind}/city-{i}/appartements" for kind in ("vente","location") for i in range(4)]
    sitemap=("<urlset>"+ "".join(f"<url><loc>{u}</loc></url>" for u in old+extra) + "</urlset>").encode()
    called=[]
    def fake(url,cap=2_000_000):
        called.append(url)
        if url==m.ROBOT:return ROBOTS.encode()
        if url==m.SITEMAP:return sitemap
        return HTML
    with tempfile.TemporaryDirectory() as d,patch.object(m,"fetch",side_effect=fake),patch.object(m.time,"sleep"):
        out=m.collect(Path(d),8,1.3,"balanced-new")
    self.assertEqual(out["selected_pages"],8)
    self.assertEqual(out["selected_type_counts"],{"vente":4,"location":4})
    self.assertEqual(out["selected_overlap_prior_60"],0)
    self.assertTrue(set(called[2:]).isdisjoint(old))
    self.assertEqual(out["pages_successful"],8)
 def test_invalid_selection_fails_before_any_network(self):
    with self.assertRaises(ValueError):
        m.collect(Path("."),8,1.3,"unknown")
if __name__=="__main__":unittest.main()
