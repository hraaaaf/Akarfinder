"""Q1F candidate changes: strict synthetic source evidence / no guesswork."""
from datetime import datetime,timezone
from pathlib import Path
import json,sys,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import akarparser_v3_raw_bulk as v3
NOW=datetime(2026,11,9,17,tzinfo=timezone.utc)
def doc(title,desc,body,host,*,price=1400000,area=105):
    listing={"@type":"RealEstateListing","name":title,"description":desc,
             "address":{"addressLocality":"Casablanca"},
             "floorSize":{"value":area,"unitCode":"MTK"},
             "offers":{"price":price,"priceCurrency":"MAD"}}
    html="<html><head><script type='application/ld+json'>"+json.dumps(listing,ensure_ascii=False)+"</script></head><body>"+body+"</body></html>"
    return v3.parse_raw({"raw_html":html,"source_url":host,
                         "fetched_at":"2026-11-09T16:00:00Z"},NOW)
class CandidateLocationRules(unittest.TestCase):
    def test_domio_listing_headline_not_district(self):
        x=doc("Appartement à vendre – Belvédère, Casablanca",
             "Appartement lumineux proche des transports.",
             "<p>Appartement à vendre – Belvédère, Casablanca</p>",
             "https://domio.ma/fr/appartement/vendre/casablanca/123455/accueil")
        self.assertIsNone(x["fields"]["district"])
    def test_domio_explicit_quartier_in_primary_description(self):
        x=doc("Appartement avec ascenseur",
             "Un superbe bien au quartier Belvédère – Casablanca, avec salon.",
             "<p>Appartement, Casablanca</p>",
             "https://domio.ma/fr/appartement/vendre/casablanca/123456/annonce")
        self.assertEqual(x["fields"]["district"],"Belvédère")
        self.assertIn("explicit_quartier",x["field_evidence"]["district"]["path"])
        self.assertFalse(x["quality"]["neon_product_admission_authorized"])
    def test_domio_generic_quartier_must_not_be_named_place(self):
        x=doc("Appartement à vendre",
             "Bien dans un quartier résidentiel recherché, excellent emplacement.",
             "<p>Appartement, Casablanca</p>",
             "https://domio.ma/fr/appartement/vendre/casablanca/123457/annonce")
        self.assertIsNone(x["fields"]["district"])
    def test_mubawab_listing_title_terrain_beats_broad_villas_category(self):
        title="À vendre Terrain constructible à Casablanca"
        listing={"@type":"RealEstateListing","name":title,"description":"Terrain avec maison ancienne à démolir.","offers":{"price":5000000,"priceCurrency":"MAD"}}
        html="<html><script type='application/ld+json'>"+json.dumps(listing,ensure_ascii=False)+"</script><body><p>Immobilier Casablanca</p><p>Villas Casablanca</p><p>Oasis</p><p>Obtenir un financement</p><p>310m²</p></body></html>"
        x=v3.parse_raw({"raw_html":html,"source_url":"https://www.mubawab.ma/fr/a/8310003/terrain",
                        "fetched_at":"2026-11-09T16:00:00Z"},NOW)
        self.assertEqual(x["fields"]["property_type"],"land")
        self.assertEqual(x["fields"]["district"],"Oasis")
        self.assertIn("explicit_terrain",x["field_evidence"]["property_type"]["path"])
        self.assertFalse(x["quality"]["neon_product_admission_authorized"])
    def test_mubawab_description_terrain_not_override_primary_villa(self):
        listing={"@type":"RealEstateListing","name":"Villa à vendre à Casablanca",
                 "description":"Terrain de 350 m² aménagé autour de la villa.",
                 "offers":{"price":3500000,"priceCurrency":"MAD"}}
        html="<html><script type='application/ld+json'>"+json.dumps(listing,ensure_ascii=False)+"</script><body><p>Immobilier Casablanca</p><p>Villas Casablanca</p><p>Anfa</p><p>Obtenir un financement</p><p>180m²</p></body></html>"
        x=v3.parse_raw({"raw_html":html,"source_url":"https://www.mubawab.ma/fr/a/8310004/villa",
                        "fetched_at":"2026-11-09T16:00:00Z"},NOW)
        self.assertEqual(x["fields"]["property_type"],"villa")
    def test_domio_marketing_quartier_adjective_not_place(self):
        for description in (
            "Appartement ensoleillé situé dans le quartier prisé de 2 Mars.",
            "Dans un quartier qui vit, à proximité du tramway.",
            "Ce quartier est calme et résidentiel.",
        ):
            with self.subTest(description=description):
                x=doc("Appartement ensoleillé", description,
                      "<p>Appartement, Casablanca</p>",
                      "https://domio.ma/fr/appartement/vendre/casablanca/123460/annonce")
                self.assertIsNone(x["fields"]["district"])

    def test_domio_explicit_aïn_chock_location_factual(self):
        x=doc("Appartement à vendre à Aïn Chock",
              "Quartier Aïn Chock – Proche Bd Al Qods.",
              "<p>Appartement, Casablanca</p>",
              "https://domio.ma/fr/appartement/vendre/casablanca/123461/annonce")
        self.assertEqual(x["fields"]["district"],"Aïn Chock")

if __name__=="__main__":unittest.main()
