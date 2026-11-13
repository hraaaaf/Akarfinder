"""J3 Agenz: offline headline, characteristics and map provenance regressions."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_parallel.j3_source_internal_consistency import audit_source_internal_consistency


def source(title, characteristics, attrs=""):
    return (
        f'<html><head><meta charset="utf-8"><title>{title}</title></head>'
        f'<body><div {attrs}></div><h2>Caractéristiques</h2>'
        f'<div>{characteristics}</div></body></html>'
    ).encode("utf-8")


class J3SourceConsistencyTests(unittest.TestCase):
    def test_four_rooms_in_headline_but_three_in_characteristics(self):
        r = audit_source_internal_consistency(source(
            "Appartement de 4 chambres à vendre", "3 Chambres simples 1 Salle de bains"))
        self.assertEqual(r["status"], "source_bedroom_count_disagreement")
        self.assertEqual((r["title_bedrooms"], r["characteristics_bedrooms"]), (4, 3))
        self.assertFalse(r["eligible_for_private_staging"])

    def test_suite_is_counted_with_simple_rooms(self):
        r = audit_source_internal_consistency(source(
            "Appartement de 4 chambres", "3 Chambres simples 1 suite parentale"))
        self.assertEqual(r["characteristics_bedrooms"], 4)
        self.assertFalse(r["source_bedroom_count_disagreement"])
        self.assertFalse(r["eligible_for_geo_index"])

    def test_missing_title_count_not_mistaken_for_consistency(self):
        r = audit_source_internal_consistency(source("Bel appartement", "3 Chambres simples"))
        self.assertEqual(r["status"], "source_room_count_unassessed")

    def test_openssl_salted_attributes_never_certify_geolocation(self):
        v = "U2FsdGVkX19wbGFjZWhvbGRlcg=="
        r = audit_source_internal_consistency(source(
            "Appartement de 3 chambres", "3 Chambres simples",
            f'data-lat="{v}" data-lng="{v}"'))
        self.assertEqual(r["source_map_attribute_kind"],
                         "source_encrypted_coordinates_not_independent_proof")
        self.assertFalse(r["independent_physical_location_attestation"])
        self.assertNotIn(v, str(r))

    def test_plaintext_coordinates_are_also_unverified(self):
        r = audit_source_internal_consistency(source(
            "Appartement de 2 chambres", "2 Chambres simples",
            'data-lat="34.05" data-lng="-6.79"'))
        self.assertEqual(r["source_map_attribute_kind"], "source_map_attributes_unverified")
        self.assertFalse(r["eligible_for_public_admission"])

    def test_input_is_bounded_and_utf8_only(self):
        for html in (None, "html", b"", b"x" * (4 * 1024 * 1024 + 1)):
            with self.assertRaisesRegex(ValueError, "INVALID_BOUNDED_HTML_BYTES"):
                audit_source_internal_consistency(html)
        with self.assertRaisesRegex(ValueError, "SOURCE_HTML_NOT_UTF8"):
            audit_source_internal_consistency(b"\xff\xfe")


if __name__ == "__main__":
    unittest.main()
