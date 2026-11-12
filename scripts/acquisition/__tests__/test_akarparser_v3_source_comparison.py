"""Synthetic-only safeguards for sealed, offline counter-reader comparison."""
import gzip,hashlib,json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import sys,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import akarparser_v3_source_comparison as cmp

class CompareContracts(unittest.TestCase):
    def setUp(self):
        self.dir=TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        root=Path(self.dir.name)
        self.counter=root/"source_blind.jsonl"
        self.parsed=root/"parsed.jsonl.gz"
        self.out=root/"report.jsonl"
        self.source={
            "source_file":"mubawab\\item.html",
            "source_file_sha256":"a"*64,
            "source_url":"https://www.mubawab.ma/fr/a/8455123/item",
            "portal":"mubawab.ma",
            "claims":{field:{"state":"unknown","value":None,"evidence":[]}
                      for field in cmp.FIELDS},
            "supported_field_count":2}
        self.source["claims"]["title"]={"state":"supported","value":"Appartement à vendre",
                                        "evidence":[{"path":"jsonld.name"}]}
        self.source["claims"]["city"]={"state":"supported","value":"Rabat",
                                       "evidence":[{"path":"breadcrumb"}]}
        self.parser={
            "input_ref":{"file":"mubawab\\item.html",
                         "file_sha256":"a"*64},
            "source":{"source_url":self.source["source_url"]},
            "fields":{"title":"Appartement à vendre","city":"Rabat",
                      "district":None,"price_mad":9500},
            "quality":{"status":"partial","review_reasons":[]}}
        self._write_source()
        self._write_parser()
    def _write_source(self):
        self.counter.write_text(json.dumps(self.source,ensure_ascii=False)+"\n",
                                encoding="utf8")
        digest=hashlib.sha256(self.counter.read_bytes()).hexdigest()
        self.counter.with_name(self.counter.name+".summary.json").write_text(
            json.dumps({"sha256_output":digest,"record_count":1,
                        "no_v2_v3_predictions_read":True}),encoding="utf8")
    def _write_parser(self):
        with gzip.open(self.parsed,"wt",encoding="utf8") as f:
            f.write(json.dumps(self.parser)+"\n")
    def args(self):
        return SimpleNamespace(counter=self.counter,parsed=self.parsed,
             out=self.out,expect=1,legacy=None,canonical=False)
    def test_matching_source_proof_and_unknown_do_not_claim_truth(self):
        cmp.compare(self.args())
        summary=json.loads(self.out.with_name(self.out.name+".summary.json").read_text("utf8"))
        self.assertEqual(summary["classification"]["SOURCE_MATCH"],2)
        self.assertEqual(summary["classification"]["BOTH_UNDETERMINED"],4)
        self.assertEqual(summary["classification"]["NO_INDEPENDENT_SOURCE_PROOF"],1)
        self.assertEqual(summary["human_ground_truth_labels"],0)
        self.assertFalse(summary["neon_product_admission_authorized"])
    def test_unmatching_parser_value_is_flagged_not_fixed(self):
        self.parser["fields"]["city"]="Casablanca"
        self._write_parser()
        cmp.compare(self.args())
        summary=json.loads(self.out.with_name(self.out.name+".summary.json").read_text("utf8"))
        self.assertEqual(summary["classification"]["V3_VALUE_DIFFERENCE"],1)
        line=json.loads(self.out.read_text("utf8").splitlines()[0])
        self.assertEqual(line["unresolved_mismatches"][0]["field"],"city")
        self.assertFalse(line["manual_market_truth_verified"])
    def test_counter_reader_seal_tampering_refused(self):
        self.counter.write_text(self.counter.read_text("utf8")+" ",encoding="utf8")
        with self.assertRaisesRegex(ValueError,"BLIND_COUNTER_SEAL_INVALID"):
            cmp.compare(self.args())
        self.assertFalse(self.out.exists())
    def test_parser_sha_mismatch_refused(self):
        self.parser["input_ref"]["file_sha256"]="0"*64
        self._write_parser()
        with self.assertRaisesRegex(ValueError,"SOURCE_HTML_HASH_MISMATCH"):
            cmp.compare(self.args())
    def test_no_unsafe_rewrite_of_existing_comparison(self):
        cmp.compare(self.args())
        with self.assertRaises(FileExistsError):
            cmp.compare(self.args())

if __name__=="__main__":
    unittest.main()
