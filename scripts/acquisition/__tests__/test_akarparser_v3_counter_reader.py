"""Synthetic-only independent counter-reader tests; no V3 predictions."""
import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import akarparser_v3_counter_reader as independent

def page(name,description,price,city="Nador",district="Aarid"):
    listing={"@type":"RealEstateListing","name":name,
             "description":description,
             "offers":{"price":price,"priceCurrency":"MAD"}}
    markup=("<html><head><script type='application/ld+json'>"
            +json.dumps(listing,ensure_ascii=False)
            +"</script></head><body>"
            +"<p>Immobilier Maroc</p><p>Immobilier "+city+"</p>"
            +"<p>Appartements "+city+"</p><p>"+district+"</p>"
            +"<p>Obtenir un financement</p><p>63m²</p>"
            +"</body></html>")
    return markup.encode("utf8"),"https://www.mubawab.ma/fr/a/8123456/project"

class IndependentSourceOnlyTests(unittest.TestCase):
    def test_unit_rate_alone_does_not_become_total_sale_price(self):
        raw,url=page(
            "Vivez le luxe à Nador, Appartements piscine privée",
            "Appartements haut de gamme à vendre. Duplex au design moderne. "
            "Prix à partir de 9500 dhs /m²",9500)
        data=independent.extract(raw,url)
        self.assertEqual(data["claims"]["property_type"]["value"],"apartment")
        self.assertEqual(data["claims"]["price_mad"]["state"],"unknown")
        self.assertEqual(data["claims"]["surface_total_m2"]["value"],63.0)
        self.assertEqual(data["claims"]["district"]["value"],"Aarid")
        self.assertEqual(data["claims"]["title"]["state"],"supported")
        self.assertFalse(data.get("real_world_accuracy_certified",False))

    def test_total_price_preserved_when_distinct_from_unit_rate(self):
        raw,url=page("Appartement à vendre à Nador",
                     "Prix moyen 9500 dhs /m², total annoncé 2160000 MAD",2160000)
        data=independent.extract(raw,url)
        self.assertEqual(data["claims"]["price_mad"]["value"],2160000.0)
        self.assertEqual(data["claims"]["property_type"]["value"],"apartment")

    def test_explicit_duplex_title_overrides_general_apartment_category(self):
        raw,url=page("Duplex à vendre à Nador",
                     "Duplex de 63m²",2160000)
        data=independent.extract(raw,url)
        self.assertEqual(data["claims"]["property_type"]["value"],"duplex")

    def test_domio_marketing_heading_not_neighborhood(self):
        listing={"@type":"RealEstateListing",
                 "name":"Bonne affaire à Belvédère – Appartement 80 m²",
                 "address":{"addressLocality":"Casablanca"},
                 "floorSize":{"unitCode":"MTK","value":80},
                 "price":{"price":1500000,"priceCurrency":"MAD"}}
        html=("<html><script type='application/ld+json'>"
              +json.dumps(listing,ensure_ascii=False)
              +"</script><p>Appartement à vendre – Belvédère, Casablanca</p>"
              +"</html>")
        data=independent.extract(html.encode("utf8"),
            "https://domio.ma/fr/appartement/vendre/casablanca/12345/offre")
        self.assertEqual(data["claims"]["district"]["state"],"unknown")
        self.assertEqual(data["claims"]["city"]["value"],"Casablanca")

    def test_two_conflicting_headline_transactions_remain_conflict(self):
        raw,url=page("Appartement à vendre et à louer à Nador",
                     "Consultez notre catalogue",2160000)
        data=independent.extract(raw,url)
        self.assertEqual(data["claims"]["transaction_type"]["state"],"conflict")
        self.assertIsNone(data["claims"]["transaction_type"]["value"])

    def test_no_v2_or_v3_parser_module_in_counter_reader_imports(self):
        # This guard enforces architectural separation, not human independence.
        import ast
        source=Path(independent.__file__).read_text("utf8")
        tree=ast.parse(source)
        imported=set()
        for node in ast.walk(tree):
            if isinstance(node,ast.Import):
                imported.update(n.name for n in node.names)
            elif isinstance(node,ast.ImportFrom) and node.module:
                imported.add(node.module)
        self.assertFalse(any("akarparser_v2" in m or "akarparser_v3_raw_bulk" in m
                             or "akarparser_v3_portals" in m
                             for m in imported))

if __name__=="__main__":
    unittest.main()
