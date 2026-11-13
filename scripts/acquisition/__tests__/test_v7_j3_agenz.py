import sys
from pathlib import Path
from tempfile import TemporaryDirectory
import json
import unittest
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_parallel.j3_agenz_corpus import assess_corpus, CorpusError
from v7_multisource.snapshot_evidence import _manifest

NOW=datetime(2026,11,13,tzinfo=timezone.utc)
BASE="https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/"
HTML=b'<!DOCTYPE html><html><head><title>Appartement a vendre</title></head><body><h1>Appartement a vendre</h1><p>980 000 DH</p><p>104 m2</p></body></html>'

class J3Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)

    def add(self,identity):
        d=self.root/str(identity)
        d.mkdir()
        url=BASE+str(identity)
        raw=HTML.replace(b"Appartement a vendre",("Appartement "+str(identity)).encode())
        manifest=_manifest(url,raw,when=NOW,method="explicit_single_page_https_get")
        (d/"source.html").write_bytes(raw)
        (d/"source.manifest.json").write_text(json.dumps(manifest))
        return {"folder":str(d),"expected":{"price_mad":980000}}

    def test_verified_hash_and_corpus_is_not_ground_truth(self):
        r=assess_corpus([self.add(444291),self.add(444292)])
        self.assertEqual(r["snapshots"],2)
        self.assertEqual(r["status"],"pilot_only")
        self.assertFalse(r["representative_accuracy_certified"])
        self.assertEqual(r["db_writes"],0)
        self.assertEqual(r["source_network_requests"],0)

    def test_five_distinct_snapshots_only_enables_human_label_review(self):
        r=assess_corpus([self.add(444291+i) for i in range(5)])
        self.assertEqual(r["status"],"corpus_ready_for_human_labels")
        self.assertFalse(r["representative_accuracy_certified"])

    def test_duplicate_source_id_is_rejected(self):
        a=self.add(444291)
        with self.assertRaisesRegex(CorpusError,"DUPLICATE_SOURCE_OFFER_ID"):
            assess_corpus([a,a])

    def test_tampered_html_is_rejected_before_parsing(self):
        a=self.add(444291)
        (Path(a["folder"])/"source.html").write_bytes(b"<html>tampered</html>")
        with self.assertRaises(Exception):
            assess_corpus([a])

    def test_claimed_unsupported_field_is_rejected(self):
        a=self.add(444291)
        a["expected"]={"rights_verified":True}
        with self.assertRaisesRegex(CorpusError,"UNSUPPORTED_EXPECTATIONS"):
            assess_corpus([a])
if __name__=="__main__": unittest.main()
