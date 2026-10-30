import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import fresh_snapshot as m

ROBOTS='User-agent: *\nDisallow: /login\nDisallow: /*:\nDisallow: /*?n=1\n'
PAGE='<html><body><a href="/fr/ct/casablanca/immobilier-a-vendre">Casablanca</a><a href="/fr/a/12345/centre">One</a><a href="/fr/a/98765/other">Two</a><a href="/fr/test:p:2">Skip</a></body></html>'
DETAIL='<html><head><title>Appartement lumineux</title><meta name="description" content="Description propre" /></head><body><h1>Appartement Casablanca</h1><p>120 m²</p><p>1 200 000 DH</p><img src="https://www.mubawab-media.com/ad/12.jpg?x=3"><img src="https://www.mubawab-media.com/assets/logo.png"></body></html>'

class Response:
    def __init__(self,url,body,status=200):self.url=url;self.text=body;self.status_code=status
class FakeSession:
    def __init__(self,mapping):self.mapping=mapping;self.urls=[];self.headers={}
    def get(self,url,**kwargs):
        self.urls.append(url)
        result=self.mapping.get(url)
        if result is None:raise AssertionError('Unplanned request: '+url)
        return Response(url,*result) if isinstance(result,tuple) else Response(url,result)

class Tests(unittest.TestCase):
    def test_normalization_and_blocked_urls(self):
        self.assertEqual(m.canonical('https://www.mubawab.ma/fr/a/12345/test?x=1'),None)
        self.assertIsNone(m.canonical('/fr/%3Ap%3A2'))
        self.assertIsNone(m.canonical('/fr/cms/admin'))
        self.assertIsNone(m.canonical('https://bad.example/fr/a/12345/x'))
        self.assertEqual(m.listing_id('https://www.mubawab.ma/fr/pa/12345/foo'),'12345')
    def test_robots_encoded_denial(self):
        robot=m.Robots(ROBOTS,m.UA)
        self.assertFalse(robot.allowed('https://www.mubawab.ma/fr/test%3Ap%3A2'))
        self.assertFalse(robot.allowed('https://www.mubawab.ma/fr/login'))
        self.assertTrue(robot.allowed('https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre'))
    def test_no_new_network_without_robots(self):
        s=FakeSession({});w=m.Web(session=s,sleep=lambda _:None)
        with self.assertRaises(m.StopCollect):w.fetch(m.BASE+'/fr')
        self.assertEqual(s.urls,[])
    def test_html_parse_and_photos(self):
        r=m.parse_listing(DETAIL,m.BASE+'/fr/a/12345/centre')
        self.assertEqual(r['id'],'12345');self.assertEqual(r['price_dh'],1200000)
        self.assertEqual(r['area_m2'],120)
        self.assertEqual(r['photos'],['https://www.mubawab-media.com/ad/12.jpg'])
        self.assertEqual(len(m.discover(PAGE,m.BASE+'/fr')),3)
    def test_fresh_true_independent_and_replay(self):
        with tempfile.TemporaryDirectory() as t:
            pages={m.BASE+'/robots.txt':ROBOTS,m.BASE+'/fr':PAGE,
              m.BASE+'/fr/ct/casablanca/immobilier-a-vendre':PAGE,
              m.BASE+'/fr/a/12345/centre':DETAIL,
              m.BASE+'/fr/a/98765/other':DETAIL}
            fake=FakeSession(pages)
            w=m.Web(session=fake,sleep=lambda _:None,delay=2)
            result=m.do_fresh(Path(t),w,max_pages=2,max_details=2)
            self.assertEqual(result['details'],2)
            self.assertEqual(result['pages'],2)
            self.assertEqual(result['photo_urls'],2)
            self.assertEqual(result['saved_html_blobs'],2)
            self.assertNotIn('/fr/test:p:2',str(fake.urls))
            self.assertEqual(len(list(m.iter_records(Path(t)/'listings.jsonl'))),2)
    def test_stop_on_429(self):
        with tempfile.TemporaryDirectory() as t:
            s=FakeSession({m.BASE+'/robots.txt':ROBOTS,m.BASE+'/fr':('rate limited',429)})
            r=m.do_fresh(Path(t),m.Web(session=s,sleep=lambda _:None),max_pages=3,max_details=3)
            self.assertEqual(r['stopped_early'],'http_429');self.assertEqual(r['details'],0)
            self.assertEqual(len(s.urls),2)
    def test_robots_fail_closed(self):
        with tempfile.TemporaryDirectory() as t:
            s=FakeSession({m.BASE+'/robots.txt':('error',404)})
            r=m.do_fresh(Path(t),m.Web(session=s,sleep=lambda _:None),max_pages=2,max_details=2)
            self.assertEqual(r['stopped_early'],'http_404');self.assertEqual(s.urls,[m.BASE+'/robots.txt'])
    def test_compare_id_dedupe_no_hard_merge_on_photo(self):
        with tempfile.TemporaryDirectory() as t:
            t=Path(t);fresh=t/'new.jsonl';old=t/'old.jsonl'
            one={'source':'mubawab','id':'12345','url':m.BASE+'/fr/a/12345/1','price_dh':150,'photos':['https://www.mubawab-media.com/ad/a.jpg']}
            two={'source':'mubawab','id':'98765','url':m.BASE+'/fr/a/98765/2','photos':['https://www.mubawab-media.com/ad/b.jpg']}
            hist=[dict(one,price_dh=100), {'source':'mubawab','id':'55555','url':m.BASE+'/fr/a/55555/3','photos':['https://www.mubawab-media.com/ad/b.jpg']}]
            fresh.write_text('\n'.join(json.dumps(x) for x in [one,one,two])+'\n')
            old.write_text('\n'.join(json.dumps(x) for x in hist)+'\n')
            r=m.compare(fresh,old,t/'out')
            self.assertEqual((r['fresh_unique_ids'],r['fresh_input_duplicates'],r['exact_id_overlap'],r['fresh_only_ids'],r['historical_only_ids']),(2,1,1,1,1))
            self.assertEqual(r['changed_record_count'],1)
            self.assertEqual(r['possible_cross_id_photo_matches'],1)
    def test_comparison_does_not_fetch_network(self):
        with tempfile.TemporaryDirectory() as t:
            t=Path(t);p=t/'a.jsonl';p.write_text('')
            with patch.object(m.requests.Session,'get',side_effect=AssertionError('No network')):
                self.assertEqual(m.compare(p,p,t/'o')['historical_unique_ids'],0)
    def test_historical_sqlite_schema(self):
        import sqlite3
        with tempfile.TemporaryDirectory() as t:
            db=sqlite3.connect(str(Path(t)/'old.sqlite'))
            db.execute('CREATE TABLE listings(id TEXT,url TEXT,data TEXT,photos TEXT)')
            db.execute('INSERT INTO listings VALUES (?,?,?,?)',('12345',m.BASE+'/fr/a/12345/a',json.dumps({'title':'old'}),json.dumps(['https://www.mubawab-media.com/ad/a.jpg'])))
            db.commit();db.close()
            row=list(m.iter_records(Path(t)/'old.sqlite'))[0]
            self.assertEqual(row['id'],'12345')
            self.assertEqual(len(row['photos']),1)
    def test_main_prevents_overwriting_fresh_and_requires_explicit_resume(self):
        with tempfile.TemporaryDirectory() as t:
            (Path(t)/'fresh.sqlite').touch()
            with self.assertRaises(SystemExit):m.main(['fresh','--work',t])
    def test_old_database_has_no_effect_on_new_discovery(self):
        with tempfile.TemporaryDirectory() as t:
            t=Path(t);(t/'historical.zip').write_bytes(b'old-not-used')
            sess=FakeSession({m.BASE+'/robots.txt':ROBOTS,m.BASE+'/fr':'<html><body>empty</body></html>'})
            result=m.do_fresh(t/'new',m.Web(session=sess,sleep=lambda _:None),max_pages=1,max_details=1)
            self.assertEqual(result['details'],0)
            self.assertEqual(result['state'],'bounded_complete')
            self.assertEqual(len(sess.urls),2)
    def test_zip_archive_supported(self):
        import zipfile
        with tempfile.TemporaryDirectory() as t:
            t=Path(t);p=t/'old.zip'
            with zipfile.ZipFile(p,'w') as z:z.writestr('export_combined/listings.jsonl',json.dumps({'source':'mubawab','id':'12345','url':m.BASE+'/fr/a/12345/a'})+'\n')
            self.assertEqual(len(list(m.iter_records(p))),1)

if __name__=='__main__':unittest.main()