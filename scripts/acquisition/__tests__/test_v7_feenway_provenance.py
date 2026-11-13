import gzip
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile

ACQUISITION = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ACQUISITION))
from v7_multisource.feenway_provenance import run


def fixture(path, rows):
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("feenway_annonces_trie_et_complet.json", json.dumps(rows, ensure_ascii=False))
        z.writestr("feenway_rapport_final.json",
                   json.dumps({"annonces_recuperees_uniques": len(rows)}))
        z.writestr("README_AKARFINDER_IMPORT.txt", "offline unit fixture")


def sample(fid="199629", photos=None):
    return {"nom_annonce": "Appartement à louer à Temara Nahda – 900 DH/nuit",
            "url": f"https://www.feenway.com/listings/{fid}", "ville": "1",
            "quartier": "Temara Nahda", "superficie": "35 m²", "prix": "900 MAD",
            "liens_photos": photos if photos is not None else
            ["https://content.avito.ma/classifieds/images/10156945106?t=images"]}


class FeenwayGateTest(unittest.TestCase):
    def test_sample_without_evidence_is_quarantined(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fixture(root / "a.zip", [sample()])
            report = run(root / "a.zip", root / "out")
            self.assertEqual(report["source_rows"], 1)
            self.assertEqual(report["public_admission_eligible"], 0)
            self.assertEqual(report["photo_portal_hints_not_proof"], {"avito.ma": 1})
            with gzip.open(root / "out/candidates_QUARANTINE.jsonl.gz", "rt",
                           encoding="utf-8") as f:
                item = json.loads(f.readline())
            self.assertEqual(item["admission_status"], "Q_UPSTREAM_ORIGINAL_IDENTITY_MISSING")
            self.assertEqual(item["price_basis_claim"], "night_claim")
            self.assertIn("PRICE_PERIOD_FROM_TITLE_UNVERIFIED", item["quality_flags"])
            self.assertIsNone(item["upstream_candidate"])

    def test_mubawab_photo_is_hint_not_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fixture(root / "a.zip", [sample(photos=[
                "https://www.mubawab-media.com/ad/8/423/416F/h/LAND_1_83306494.avif"])])
            run(root / "a.zip", root / "out")
            with gzip.open(root / "out/candidates_QUARANTINE.jsonl.gz", "rt",
                           encoding="utf-8") as f:
                item = json.loads(f.readline())
            self.assertEqual(item["photo_source_hints"], ["mubawab.ma"])
            self.assertIsNone(item["upstream_candidate"])

    def test_self_asserted_mapping_never_promotes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fixture(root / "a.zip", [sample()])
            o = root / "observations.jsonl"
            o.write_text(json.dumps({"feenway_url": sample()["url"],
                "upstream_url": "https://mubawab.ma/fr/a/8423416",
                "upstream_offer_id": "8423416"}) + "\n")
            report = run(root / "a.zip", root / "out", o)
            self.assertEqual(report["public_admission_eligible"], 0)
            self.assertEqual(report["quarantine_status"], {"Q_UPSTREAM_MAPPING_FORMAT_ONLY": 1})

    def test_spoofed_upstream_host_is_not_trusted(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fixture(root / "a.zip", [sample()])
            o = root / "observations.jsonl"
            o.write_text(json.dumps({"feenway_url": sample()["url"],
                "upstream_url": "https://mubawab.ma.attacker.com/fr/a/8423416",
                "upstream_offer_id": "8423416"}) + "\n")
            report = run(root / "a.zip", root / "out", o)
            self.assertEqual(report["quarantine_status"],
                             {"Q_UPSTREAM_ORIGINAL_IDENTITY_MISSING": 1})

    def test_duplicate_feenway_id_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fixture(root / "a.zip", [sample(), sample()])
            with self.assertRaisesRegex(ValueError, "DUPLICATE_OR_INVALID_FEENWAY_ID"):
                run(root / "a.zip", root / "out")

    def test_unexpected_archive_path_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with zipfile.ZipFile(root / "a.zip", "w") as z:
                z.writestr("../foo.json", "{}")
            with self.assertRaisesRegex(ValueError, "UNEXPECTED_ZIP_CONTENT"):
                run(root / "a.zip", root / "out")

    def test_mixed_photo_hosts_are_not_attributed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fixture(root / "a.zip", [sample(photos=[
                "https://content.avito.ma/x", "https://www.mubawab-media.com/y"])])
            run(root / "a.zip", root / "out")
            with gzip.open(root / "out/candidates_QUARANTINE.jsonl.gz", "rt",
                           encoding="utf-8") as f:
                item = json.loads(f.readline())
            self.assertEqual(item["photo_source_hints"], ["avito.ma", "mubawab.ma"])
            self.assertIn("UPSTREAM_PHOTO_HINT_AMBIGUOUS_OR_ABSENT",
                          item["quality_flags"])


if __name__ == "__main__":
    unittest.main()
