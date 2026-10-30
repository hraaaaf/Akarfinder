import unittest, tempfile, json, sqlite3
from pathlib import Path
from unittest.mock import patch, Mock
import mubawab_full as m


def page(*ids):
 return '<html><body>'+''.join(f'<div class="listingBox"><h2><a href="/fr/a/{i}/bien">Appartement {i}</a></h2><p>Maârif, Casablanca</p><p>120 m²</p><p>3 Pièces</p><p>2 Chambres</p><p>1 Salle de bains</p><p>1 200 000 DH</p><img src="https://www.mubawab-media.com/ad/{i}.avif"></div>' for i in ids)+'</body></html>'
class Fake:
 blocked=False
 def __init__(self,values): self.values=iter(values);self.errors=[];self.pages=[];self.urls=[]
 def get(self,url): self.urls.append(url);return next(self.values)

class Tests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.db=m.db_open(self.tmp.name+'/state.db');m.add_seeds(self.db,['casablanca'],['vendre'])
 def tearDown(self): self.db.close();self.tmp.cleanup()
 @unittest.skipUnless(Path("evidence/page1.html").exists(), "HTML historique non inclus")
 def test_real_html(self):
  r=m.parse_page(Path('evidence/page1.html').read_text());self.assertEqual(len(r),31);self.assertEqual(sum(len(x['photos']) for x in r),397)
  self.assertEqual(r[0]['price_dh'],2900000);self.assertEqual(r[0]['city'],'Casablanca');self.assertEqual(r[0]['area_m2'],166)
 def test_fields_and_image_scope(self):
  r=m.parse_page(page(1,2));self.assertEqual(len(r),2)
  self.assertEqual(r[0]['price_dh'],1200000);self.assertEqual(r[0]['bedrooms'],2)
  self.assertEqual(r[0]['photos'],['https://www.mubawab-media.com/ad/1.avif'])
 def test_sitemap_known_records_do_not_stop_pagination(self):
  self.db.execute('INSERT INTO listings(id,url) VALUES (?,?)',('1',m.BASE+'/fr/a/1/bien'));self.db.commit()
  h=Fake([page(1),page(2)]);m.run_list(h,self.db,2)
  self.assertEqual(self.db.execute('SELECT count(*) FROM listings').fetchone()[0],2)
  self.assertEqual(self.db.execute('SELECT next_page FROM seeds').fetchone()[0],3)
 def test_resume(self):
  m.run_list(Fake([page(1)]),self.db,1);self.db.close();self.db=m.db_open(self.tmp.name+'/state.db')
  h=Fake([page(2)]);m.run_list(h,self.db,1);self.assertTrue(h.urls[0].endswith(':p:2'))
 def test_empty_not_certified_finished(self):
  h=Fake(['<html></html>']);m.run_list(h,self.db,2)
  self.assertEqual(self.db.execute('SELECT finished,next_page FROM seeds').fetchone(),(0,1))
  self.assertEqual(h.errors[0]['reason'],'empty_parse_unverified')
 def test_repeat_order_independent(self):
  h=Fake([page(1,2),page(2,1)]);m.run_list(h,self.db,2)
  self.assertEqual(h.errors[0]['reason'],'repeated_page_unverified')
 def test_city_scope(self):
  m.add_seeds(self.db,['rabat'],['vendre']);h=Fake([page(1)])
  m.run_list(h,self.db,1,['casablanca'],['vendre']);self.assertEqual(len(h.urls),1)
 def test_robots_wildcard_and_allow_priority(self):
  p=m.RobotsPolicy();p.parse(['User-agent: *','Disallow: /*:','Disallow: /private','Allow: /private/public'])
  self.assertTrue(p.can_fetch('AkarFinderBot',m.BASE+'/fr/test'))
  self.assertFalse(p.can_fetch('AkarFinderBot',m.BASE+'/fr/test:p:2'))
  self.assertFalse(p.can_fetch('AkarFinderBot',m.BASE+'/fr/test%3Ap%3A2'))
  self.assertTrue(p.can_fetch('AkarFinderBot',m.BASE+'/private/public'))
 def test_robot_denial_sends_no_http(self):
  h=m.Http.__new__(m.Http);h.blocked=False;h.robots_ready=True;h.user_agent='AkarFinderBot';h.errors=[]
  h.robots=m.RobotsPolicy();h.robots.parse(['User-agent: *','Disallow: /*:']);h.session=Mock()
  self.assertIsNone(h.get(m.BASE+'/fr/test:p:2'));h.session.get.assert_not_called()
 def test_403_stops_next_request(self):
  h=m.Http.__new__(m.Http);h.blocked=False;h.errors=[];h.delay=2;h.allowed=lambda u:True;h.session=Mock()
  h.session.get.return_value.status_code=403
  with patch.object(m.time,'sleep'):
   self.assertIsNone(h.get(m.BASE+'/fr/test'));self.assertIsNone(h.get(m.BASE+'/fr/test2'))
  self.assertEqual(h.session.get.call_count,1);self.assertTrue(h.blocked)
 def test_export_offline(self):
  m.run_list(Fake([page(1)]),self.db,1);out=self.tmp.name+'/out.jsonl';m.run_export(self.db,out)
  self.assertEqual(json.loads(Path(out).read_text())['id'],'1')
 def test_sitemap_stdlib_xml(self):
  h=Fake(['<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.mubawab.ma/fr/a/55/bien</loc></url></urlset>'])
  h.robots=Mock();h.robots.site_maps.return_value=[m.BASE+'/sitemap.xml'];m.discover_sitemaps(h,self.db)
  self.assertEqual(self.db.execute('SELECT id FROM listings').fetchone()[0],'55')

if __name__=='__main__':unittest.main(verbosity=2)
