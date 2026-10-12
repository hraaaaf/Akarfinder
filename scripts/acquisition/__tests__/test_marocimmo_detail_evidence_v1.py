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

 def test_schema_shape_does_not_substitute_missing_values(self):
  import json
  html='<script type="application/ld+json">'+json.dumps({'@type':'RealEstateListing','url':P,'description':'Appartement 62 m2','offers':{'price':8100,'priceCurrency':'MAD'},'address':{'addressLocality':'Marrakech'}})+'</script>'
  row=mod.parse_primary_html(html,P)
  self.assertTrue(row['schema_shape_only']['has_labeled_area_in_description'])
  self.assertEqual(row['fields']['surface_m2'],62)
 def test_primary_description_rejects_multiple_areas_ranges_and_price_per_meter(self):
  import json
  for description in ('Surface 70 m² plus terrasse 15 m²','Projet de 50-100 m²','Tarif 8500 DH/m²'):
   html='<script type="application/ld+json">'+json.dumps({'@type':'RealEstateListing','url':P,'offers':{'price':900000,'priceCurrency':'MAD'},'description':description})+'</script>'
   self.assertIsNone(mod.parse_primary_html(html,P)['fields']['surface_m2'])

 def test_nested_primary_property_fields_and_conflict_quarantine(self):
  import json
  main={'@id':P+'#property','@type':'Apartment','floorSize':{'value':89,'unitCode':'MTK'},
   'address':{'addressLocality':'Marrakech','neighborhood':'Guéliz'}}
  primary={'@type':'RealEstateListing','url':P,'offers':{'price':1200000,'priceCurrency':'MAD'},'mainEntity':main}
  html='<script type="application/ld+json">'+json.dumps(primary)+'</script>'
  row=mod.parse_primary_html(html,P)
  self.assertEqual(row['fields']['surface_m2'],89)
  self.assertEqual(row['fields']['city'],'Marrakech')
  self.assertEqual(row['fields']['district'],'Guéliz')
  self.assertTrue(row['complete_four_detail_fields'])
  primary['description']='Superficie 120 m²'
  conflicted=mod.parse_primary_html('<script type="application/ld+json">'+json.dumps(primary)+'</script>',P)
  self.assertTrue(conflicted['surface_evidence_conflict'])
  self.assertIsNone(conflicted['fields']['surface_m2'])
  main['@id']='https://www.marocimmo.com/fr/annonces/other-222#property'
  isolated=mod.parse_primary_html('<script type="application/ld+json">'+json.dumps(primary)+'</script>',P)
  self.assertFalse(isolated['schema_shape_only']['nested_identity_accepted'])
  self.assertIsNone(isolated['fields']['city'])

if __name__=='__main__':unittest.main()
