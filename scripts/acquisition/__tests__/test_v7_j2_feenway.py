import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_parallel.j2_feenway_provenance import analyze_feenway_mirror, ProvenanceError

MIRROR="https://www.feenway.com/listings/258638"
ORIGIN="https://www.mubawab.ma/fr/a/9961000/flat"

class J2Tests(unittest.TestCase):
    def test_badge_only_is_not_origin(self):
        r=analyze_feenway_mirror(MIRROR,"<html><div>Source : mubawab</div></html>")
        self.assertEqual(r["status"],"origin_not_proven")
        self.assertIsNone(r["origin_offer_id"])
        self.assertFalse(r["mirror_is_new_property"])

    def test_original_outbound_cta_is_only_a_claim_until_independent_fetch(self):
        r=analyze_feenway_mirror(MIRROR,
            '<html><a href="'+ORIGIN+'">Visiter le site de l\'annonce</a></html>')
        self.assertEqual(r["origin_portal"],"mubawab.ma")
        self.assertEqual(r["origin_offer_id"],"9961000")
        self.assertFalse(r["origin_page_independently_verified"])
        self.assertFalse(r["eligible_for_public_admission"])
        self.assertEqual(r["db_writes"],0)

    def test_two_competing_originals_are_ambiguous(self):
        html='<html><a href="'+ORIGIN+'">Visiter le site de l\'annonce</a><a href="https://www.avito.ma/fr/casa/appartements/test_12345678.htm">Voir l\'annonce originale</a></html>'
        self.assertEqual(analyze_feenway_mirror(MIRROR,html)["status"],"ambiguous_origin")

    def test_spoofed_origin_not_accepted(self):
        for link in ("https://mubawab.ma.evil.example/fr/a/9961000",
                     "http://www.mubawab.ma/fr/a/9961000",
                     "https://www.mubawab.ma:9443/fr/a/9961000",
                     "https://www.mubawab.ma/fr/a/9961000?track=1",
                     "https://www.feenway.com/listings/258638"):
            with self.subTest(link=link):
                r=analyze_feenway_mirror(MIRROR,'<html><a href="'+link+'">Visiter le site de l\'annonce</a></html>')
                self.assertIsNone(r["origin_offer_id"])

    def test_mirror_must_be_individual(self):
        for x in ("http://www.feenway.com/listings/258638",
                  "https://www.feenway.com/immobilier",
                  "https://www.feenway.com/listings/258638?utm=foo"):
            with self.assertRaises(ProvenanceError):
                analyze_feenway_mirror(x,"<html></html>")

if __name__ == "__main__": unittest.main()
