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

    def test_observed_feenway_outbound_links_256946_258638(self):
        # Links observed in rendered public pages; not raw source HTML.
        mub="https://www.mubawab.ma/fr/a/8449079/%C3%A0-vendre-%E2%80%93-bel-appartement-%C3%A0-hay-riad-rabat"
        avi="https://www.avito.ma/fr/hay_riad/appartements/Appartement_PRESTIGIA_HAU_RIAD_59015264.htm"
        a=analyze_feenway_mirror(
            "https://www.feenway.com/listings/258638",
            '<html><a href="'+mub+'">Voir sur Mubawab</a></html>')
        self.assertEqual((a["origin_portal"],a["origin_offer_id"]),("mubawab.ma","8449079"))
        self.assertEqual(a["status"],"origin_link_observed_unverified")
        self.assertFalse(a["origin_page_independently_verified"])
        b=analyze_feenway_mirror(
            "https://www.feenway.com/listings/256946",
            '<html><a href="'+avi+'">Voir sur Avito</a></html>')
        self.assertEqual((b["origin_portal"],b["origin_offer_id"]),("avito.ma","59015264"))
        self.assertFalse(b["mirror_is_new_property"])

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


    def test_original_discovery_queue_uses_upstream_not_feenway_id(self):
        from v7_parallel.j2_feenway_provenance import build_upstream_candidate_queue
        one=analyze_feenway_mirror(
            "https://www.feenway.com/listings/258638",
            '<html><a href="'+ORIGIN+'">Voir sur Mubawab</a></html>')
        two=analyze_feenway_mirror(
            "https://www.feenway.com/listings/258639",
            '<html><a href="'+ORIGIN+'">Voir sur Mubawab</a></html>')
        unresolved=analyze_feenway_mirror(
            "https://www.feenway.com/listings/258640",
            "<html><p>Source: Mubawab</p></html>")
        out=build_upstream_candidate_queue([one,two,unresolved])
        self.assertEqual(out["candidate_count"],1)
        self.assertEqual(out["unresolved_mirrors"],1)
        row=out["upstream_url_candidates"][0]
        self.assertEqual(row["source_url"],ORIGIN)
        self.assertEqual(row["source_offer_id"],"9961000")
        self.assertEqual(row["discovered_via_feenway_ids"],["258638","258639"])
        self.assertFalse(row["eligible_for_public_admission"])
        self.assertEqual(out["db_writes"],0)

    def test_original_queue_fails_closed_on_same_id_with_variant_url(self):
        from v7_parallel.j2_feenway_provenance import build_upstream_candidate_queue
        one=analyze_feenway_mirror(
            "https://www.feenway.com/listings/258638",
            '<html><a href="'+ORIGIN+'">Voir sur Mubawab</a></html>')
        two=analyze_feenway_mirror(
            "https://www.feenway.com/listings/258639",
            '<html><a href="https://www.mubawab.ma/fr/a/9961000/changed">Voir sur Mubawab</a></html>')
        with self.assertRaisesRegex(ProvenanceError,"ORIGINAL_ID_URL_CONFLICT"):
            build_upstream_candidate_queue([one,two])

    def test_two_public_original_pages_price_and_area_consistent(self):
        from v7_parallel.j2_feenway_provenance import compare_rendered_claims
        cases=[
            ("258638","https://www.mubawab.ma/fr/a/8449079/%C3%A0-vendre-%E2%80%93-bel-appartement-%C3%A0-hay-riad-rabat","Mubawab",4350000,169),
            ("256946","https://www.avito.ma/fr/hay_riad/appartements/Appartement_PRESTIGIA_HAU_RIAD_59015264.htm","Avito",5500000,165),
        ]
        for mid,url,source,price,area in cases:
            mirror=analyze_feenway_mirror(
                "https://www.feenway.com/listings/"+mid,
                '<html><a href="'+url+'">Voir sur '+source+'</a></html>')
            row=compare_rendered_claims(
                mirror,{"price_mad":price,"surface_m2":area},
                {"source_url":url,"price_mad":price,"surface_m2":area})
            self.assertTrue(row["rendered_price_and_surface_match"])
            self.assertFalse(row["raw_source_html_verified"])
            self.assertFalse(row["public_admission"])

    def test_rendered_mismatch_not_silently_deduplicated(self):
        from v7_parallel.j2_feenway_provenance import compare_rendered_claims
        mirror=analyze_feenway_mirror(
            MIRROR, '<html><a href="'+ORIGIN+'">Voir sur Mubawab</a></html>')
        row=compare_rendered_claims(
            mirror,{"price_mad":4400000,"surface_m2":169},
            {"source_url":ORIGIN,"price_mad":4350000,"surface_m2":169})
        self.assertFalse(row["rendered_price_and_surface_match"])
        self.assertFalse(row["observed_fields_equal"]["price_mad"])

if __name__ == "__main__": unittest.main()
