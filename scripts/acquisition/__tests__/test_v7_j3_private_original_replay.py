"""J3 real private replay contract tested with synthetic metadata only."""
from __future__ import annotations
import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile, ZIP_DEFLATED
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_parallel.j3_private_original_replay import (
    IDS, J3PrivateReplayRejected, _contract, replay_private_corpus
)


def values():
    return {
        "snapshots": 5, "independent_source_ids": 5,
        "status": "corpus_ready_for_human_labels",
        "db_writes": 0,
        "representative_accuracy_certified": False,
        "disagreements_by_field": {},
        "results": [{"source_offer_id":item,"sha256":hashlib.sha256(item.encode()).hexdigest()}
                    for item in IDS],
    }


def audits():
    return {
        item: {
            "source_bedroom_count_disagreement": item == "387448",
            "source_map_attribute_kind":
                "source_encrypted_coordinates_not_independent_proof",
            "independent_physical_location_attestation": False,
            "eligible_for_private_staging": False,
        } for item in IDS
    }


class J3PrivateOriginalReplayContracts(unittest.TestCase):
    def test_five_original_metadata_contract_without_admission(self):
        _contract(values(), audits())

    def test_source_field_divergence_rejected(self):
        v=values()
        v["disagreements_by_field"]["district"]=1
        with self.assertRaisesRegex(J3PrivateReplayRejected,"J3_CANONICAL_L4_V3_DIVERGENCE"):
            _contract(v,audits())

    def test_missing_original_id_rejected(self):
        v=values()
        v["results"]=v["results"][:-1]
        with self.assertRaises(J3PrivateReplayRejected):
            _contract(v,audits())

    def test_encrypted_map_never_independent_location(self):
        a=audits()
        a["444291"]["independent_physical_location_attestation"]=True
        with self.assertRaisesRegex(J3PrivateReplayRejected,"J3_INTERNAL_SOURCE_CONTRADICTION"):
            _contract(values(),a)

    def test_title_characteristics_conflict_is_never_suppressed(self):
        a=audits()
        a["387448"]["source_bedroom_count_disagreement"]=False
        with self.assertRaises(J3PrivateReplayRejected):
            _contract(values(),a)

    def test_private_bundle_missing_or_operator_pin_wrong_fails_closed(self):
        with self.assertRaisesRegex(J3PrivateReplayRejected,"OPERATOR_ZIP_PIN_REQUIRED_OR_MISMATCH"):
            replay_private_corpus(Path("/missing/source-j3.zip"),operator_sha256="a"*64)
        with TemporaryDirectory() as work:
            path=Path(work)/"bundle.zip"
            path.write_bytes(b"synthetic")
            with self.assertRaisesRegex(J3PrivateReplayRejected,"OPERATOR_ZIP_PIN_REQUIRED_OR_MISMATCH"):
                replay_private_corpus(path,operator_sha256="b"*64)

    def test_wrong_zip_entries_rejected_even_when_operator_pin_matches(self):
        with TemporaryDirectory() as work:
            path=Path(work)/"bundle.zip"
            with ZipFile(path,"w",compression=ZIP_DEFLATED) as z:
                z.writestr("source.html","<html>synthetic</html>")
            with self.assertRaisesRegex(J3PrivateReplayRejected,"ARCHIVE_ENTRIES_INVALID"):
                replay_private_corpus(
                    path,
                    operator_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                )


if __name__=="__main__":
    unittest.main()
