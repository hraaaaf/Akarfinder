import csv
import gzip
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_multisource.feenway_photo_id_hints import review_archive, _primary_id


def make_zip(path, rows):
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("feenway_annonces_trie_et_complet.json", json.dumps(rows, ensure_ascii=False))
        z.writestr("feenway_rapport_final.json", json.dumps({"annonces_recuperees_uniques":len(rows)}))
        z.writestr("README_AKARFINDER_IMPORT.txt", "fixture only")


def row(id, imgs):
    return {"nom_annonce":"Appartement à vendre", "url":f"https://www.feenway.com/listings/{id}",
            "ville":"Casablanca", "quartier":"Maarif", "superficie":"85 m²",
            "prix":"1000000 MAD", "liens_photos":imgs}


def img(source_id, category="h"):
    return f"https://www.mubawab-media.com/ad/{source_id[0]}/{source_id[1:4]}/{source_id[4:]}F/{category}/sample.avif"


class HintTests(unittest.TestCase):
    def test_strict_mubawab_primary(self):
        self.assertEqual(_primary_id(img("8423416")), "8423416")

    def test_thumbnail_is_never_primary(self):
        self.assertIsNone(_primary_id(img("8423416", "m")))

    def test_host_spoof_refused(self):
        self.assertIsNone(_primary_id(img("8423416").replace("www.mubawab-media.com", "www.mubawab-media.com.evil.test")))

    def test_unsafe_scheme_refused(self):
        self.assertIsNone(_primary_id(img("8423416").replace("https:", "http:")))

    def test_query_photo_allowed_without_changing_id(self):
        self.assertEqual(_primary_id(img("8423416") + "?t=images"), "8423416")

    def test_mixed_gallery_thumbnail_ids_do_not_prove_other_listing(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)
            make_zip(p/"in.zip", [row(101, [img("8423416"),img("8449999", "m")])])
            x=review_archive(p/"in.zip",p/"out")
            self.assertEqual(x["single_primary_mubawab_photo_id_hint_rows"], 1)
            with gzip.open(p/"out/mubawab_photo_id_hints_QUARANTINE.jsonl.gz", "rt") as f:
                item=json.loads(f.readline())
            self.assertEqual(item["mubawab_offer_id_from_photo_hint"], "8423416")
            self.assertFalse(item["eligible_for_public_admission"])

    def test_conflicting_primary_gallery_quarantined_without_hint(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)
            make_zip(p/"in.zip", [row(101, [img("8423416"),img("8449999")])])
            x=review_archive(p/"in.zip",p/"out")
            self.assertEqual(x["single_primary_mubawab_photo_id_hint_rows"], 0)
            self.assertEqual(x["status_counts"].get("CONFLICTING_PRIMARY_PHOTOS"), 1)

    def test_two_feenway_urls_same_hint_only_review(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)
            make_zip(p/"in.zip", [row(101,[img("8423416")]),row(102,[img("8423416")])])
            x=review_archive(p/"in.zip",p/"out")
            self.assertEqual(x["candidate_id_collision_groups"], 1)
            self.assertEqual(x["candidate_id_collision_extra_rows"], 1)
            self.assertEqual(x["confirmed_property_duplicates"], 0)
            self.assertEqual(x["database_writes"], 0)
            with (p/"out/candidate_id_collisions_REVIEW_ONLY.csv").open() as f:
                coll=list(csv.DictReader(f))
            self.assertEqual(len(coll),2)
            self.assertTrue(all(q["note"] == "NOT_CONFIRMED_DUPLICATE" for q in coll))

    def test_duplicate_feenway_url_refused(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)
            make_zip(p/"in.zip", [row(101,[img("8423416")]),row(101,[img("8423416")])])
            with self.assertRaisesRegex(ValueError, "DUPLICATE_OR_INVALID"):
                review_archive(p/"in.zip",p/"out")


if __name__=="__main__":unittest.main()
