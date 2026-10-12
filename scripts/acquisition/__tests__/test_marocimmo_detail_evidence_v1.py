import unittest
from importlib.machinery import SourceFileLoader
from pathlib import Path
mod=SourceFileLoader('marocimmo_detail',str(Path(__file__).resolve().parents[1]/'marocimmo-detail-evidence-v1.py')).load_module()
P='https://www.marocimmo.com/fr/annonces/appartement-a-marrakech-136'
class Audit(unittest.TestCase):
 def test_only_individual_french_primary_urls(self):
  self.assertEqual(mod.primary_url(P)['source_id'],'marocimmo:136')
  for bad in ['https://www.marocimmo.com/fr/vente','https://evil.example/fr/annonces/foo-136',P+'?contact=1','http://www.marocimmo.com/fr/annonces/foo-136']:
   self.assertIsNone(mod.primary_url(bad))
 def test_dedup_and_deterministic_selection(self):
  a=mod.select_samples([P,P,'https://www.marocimmo.com/fr/annonces/villa-marrakech-137'])
  self.assertEqual(len(a),2);self.assertEqual(a,mod.select_samples(list(reversed([P,P,'https://www.marocimmo.com/fr/annonces/villa-marrakech-137']))))
 def test_matching_primary_json_ld_not_neighbor_card(self):
  html='<html><title>Annonce</title><script type="application/ld+json">'+__import__('json').dumps({'@graph':[
   {'@type':'RealEstateListing','url':'https://www.marocimmo.com/fr/annonces/autre-123','offers':{'price':90000000,'priceCurrency':'MAD'}},
   {'@type':'RealEstateListing','url':P,'offers':{'price':1200000,'priceCurrency':'MAD'},'floorSize':{'value':89,'unitCode':'MTK'},'address':{'addressLocality':'Marrakech','neighborhood':'Guéliz'}}]})+'</script></html>'
  r=mod.parse_primary_html(html,P)
  self.assertTrue(r['complete_four_detail_fields']);self.assertEqual(r['fields']['price_mad'],1200000)
  self.assertEqual(r['fields']['district'],'Guéliz');self.assertFalse(r['availability_certified'])
 def test_no_leakage_from_unmatched_or_unstructured_neighbor(self):
  html='<title>900 000 MAD Casablanca Maarif 88m2</title><script type="application/ld+json">{"@type":"RealEstateListing","url":"https://www.marocimmo.com/fr/annonces/other-111","offers":{"price":900000,"priceCurrency":"MAD"}}</script>'
  r=mod.parse_primary_html(html,P)
  self.assertEqual(r['fields_present'],0);self.assertFalse(r['complete_four_detail_fields'])
 def test_missing_neighborhood_is_not_inferred_from_city(self):
  html='<script type="application/ld+json">'+__import__('json').dumps({'@type':'RealEstateListing','url':P,'offers':{'price':1200000,'priceCurrency':'MAD'},'floorSize':{'value':89,'unitCode':'MTK'},'address':{'addressLocality':'Marrakech'}})+'</script>'
  r=mod.parse_primary_html(html,P);self.assertIsNone(r['fields']['district']);self.assertFalse(r['complete_four_detail_fields'])
if __name__=='__main__':unittest.main()
