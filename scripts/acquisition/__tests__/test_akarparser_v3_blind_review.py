"""Synthetic-only tests for V3 blind human review handoff; no real labels."""
import copy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import akarparser_v3_blind_review as blind


def put_jsonl(path, rows):
    path.write_text("\n".join(json.dumps(row) for row in rows)+"\n",encoding="utf-8")


def add_capture(root, relative, data, url):
    path=root/relative
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(data)
    digest=hashlib.sha256(data).hexdigest()
    (path.parent/(path.name+".meta.json")).write_text(
        json.dumps({"source_url":url,"fetched_at":"2026-11-10T01:00:00Z",
                    "html_sha256":digest,"http_status":200}),encoding="utf-8")
    return digest


class BlindReviewerPacketContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=TemporaryDirectory()
        root=Path(cls.tmp.name)
        cls.original=root/"orig"
        cls.canonical=root/"canon"
        cls.priority=root/"queue.jsonl"
        cls.alerts=root/"alerts.jsonl"
        cls.packet=root/"private_packet"
        cls.supervisor=root/"supervisor_private.json"
        cls.original_data=[]
        priorities=[]
        for i in range(100):
            payload=("<html><head><title>Listing "+str(i)+
                     "</title></head><body><p>Listing No "+str(i)+
                     " 120 m2, quartier Agdal</p></body></html>").encode()
            rel=f"mubawab\\original\\sample_{i:03d}.html"
            url=f"https://mubawab.ma/fr/a/{8100000+i}/test"
            digest=add_capture(cls.original,rel.replace("\\","/"),payload,url)
            cls.original_data.append((payload,digest,url))
            if i<35:
                priorities.append({"source_file":rel,"source_file_sha256":digest,
                                   "source_url":url,
                                   "priority":"P0" if i<8 else "P1",
                                   "parser_review_reasons":["SECRET_WARNING_NOT_FOR_REVIEWER"]})
        put_jsonl(cls.priority,priorities)
        alerts=[]
        for i in range(21):
            payload=cls.original_data[i][0] if i<3 else (
                "<html><title>Alert "+str(i)+
                "</title><p>Villa Location in Agadir 92 m2</p></html>").encode()
            rel=f"pages\\mubawab.ma\\canonical_{i:04d}.html"
            url=f"https://mubawab.ma/fr/a/{8200000+i}/alert"
            digest=add_capture(cls.canonical,rel.replace("\\","/"),payload,url)
            alerts.append({"canonical_page_file":rel,"html_sha256":digest,"source_url":url})
        put_jsonl(cls.alerts,alerts)
        cls.args=SimpleNamespace(original_root=cls.original,
            canonical_root=cls.canonical,priority=cls.priority,
            alerts=cls.alerts,out=cls.packet,supervisor_out=cls.supervisor)
        cls.summary=blind.prepare(cls.args)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_entire_packet_is_verified_and_reviewer_blind(self):
        summary=self.summary
        self.assertEqual(summary["original_html_sources_verified"],100)
        self.assertEqual(summary["canary_alerts_verified"],21)
        self.assertEqual(summary["same_html_sha_shared_between_groups"],3)
        self.assertEqual(summary["unique_html_reviewer_cards_by_sha"],118)
        self.assertEqual(summary["human_reviews_completed"],0)
        originals=blind.jsonl(self.packet/"labels_original100_TEMPLATE.jsonl")
        alerts=blind.jsonl(self.packet/"labels_canary21_TEMPLATE.jsonl")
        self.assertEqual((len(originals),len(alerts)),(100,21))
        self.assertTrue(all(x["fields"]["city"]["state"]=="pending" for x in originals+alerts))
        self.assertTrue(all(x["reviewer_blind_to_parser"] is False for x in originals+alerts))
        reviewer_cards="\n".join(p.read_text("utf-8") for p in (self.packet/"source_cards").glob("*.txt"))
        self.assertNotIn("SECRET_WARNING_NOT_FOR_REVIEWER",reviewer_cards)
        self.assertNotIn("parser_review_reasons",reviewer_cards)
        self.assertIn("SECRET_WARNING_NOT_FOR_REVIEWER",self.supervisor.read_text("utf-8"))
        self.assertFalse((self.packet/"supervisor_private.json").exists())

    def _copy(self):
        original=copy.deepcopy(blind.jsonl(self.packet/"labels_original100_TEMPLATE.jsonl"))
        alert=copy.deepcopy(blind.jsonl(self.packet/"labels_canary21_TEMPLATE.jsonl"))
        return original,alert

    def _annotate_fixture(self,records):
        for item in records:
            item.update({"reviewer_blind_to_parser":True,
                         "reviewer_id":"UNIT_TEST_DECLARATION",
                         "permission_evidence_ref":"UNIT_TEST_RIGHTS_FIXTURE",
                         "reviewed_at":"2026-11-10T08:00:00+00:00",
                         "manual_review_complete":True})
            card=self.packet/"source_cards"/(item["case_id"]+".txt")
            lines=card.read_text("utf-8").splitlines()
            evidence=next(f"S{i:04d}" for i,x in enumerate(lines,1) if "HTML TITLE:" in x)
            for name in blind.FIELDS:
                item["fields"][name]={"state":"present",
                    "value":120 if name in blind.NUMERIC else (
                        "rent" if name=="transaction_type" else "Listing"),
                    "evidence_ref":evidence}
        return records

    def _validate(self,originals,alerts):
        root=Path(self.tmp.name)
        a=root/"review_filled_original.jsonl"
        b=root/"review_filled_alert.jsonl"
        put_jsonl(a,originals)
        put_jsonl(b,alerts)
        return blind.validate(SimpleNamespace(packet=self.packet,original_labels=a,canary_labels=b))

    def test_blank_template_cannot_be_silently_counted_as_human_review(self):
        originals,alerts=self._copy()
        with self.assertRaisesRegex(ValueError,"HUMAN_BLIND_REVIEW_NOT_DECLARED"):
            self._validate(originals,alerts)

    def test_complete_synthetic_fixture_passes_but_never_certifies(self):
        originals,alerts=self._copy()
        report=self._validate(self._annotate_fixture(originals),
                              self._annotate_fixture(alerts))
        self.assertEqual(report["original100"]["validated_declared_human_labels"],100)
        self.assertEqual(report["canary21"]["validated_declared_human_labels"],21)
        self.assertFalse(report["human_independence_independently_verified"])
        self.assertFalse(report["certified_for_production"])

    def test_evidence_cannot_reference_metadata_or_instructions(self):
        originals,alerts=self._copy()
        self._annotate_fixture(originals);self._annotate_fixture(alerts)
        originals[0]["fields"]["city"]["evidence_ref"]="S0001"
        with self.assertRaisesRegex(ValueError,"EVIDENCE_MUST_CITE_SOURCE_CONTENT"):
            self._validate(originals,alerts)

    def test_missing_rights_reference_is_not_fabricated(self):
        originals,alerts=self._copy()
        self._annotate_fixture(originals);self._annotate_fixture(alerts)
        originals[0]["permission_evidence_ref"]=""
        with self.assertRaisesRegex(ValueError,"MISSING_RESPONSIBLE_PERMISSION_REF"):
            self._validate(originals,alerts)

    def test_priority_tampering_fails_before_creating_packet(self):
        root=Path(self.tmp.name)
        queue=blind.jsonl(self.priority)
        queue[0]["source_file_sha256"]="0"*64
        bad=root/"bad_queue.jsonl"
        put_jsonl(bad,queue)
        args=copy.copy(self.args)
        args.priority=bad
        args.out=root/"never_created_packet"
        args.supervisor_out=root/"never_created_supervisor.json"
        with self.assertRaisesRegex(ValueError,"PRIORITY_OR_ALERT_SHA_MISMATCH"):
            blind.prepare(args)
        self.assertFalse(args.out.exists())
        self.assertFalse(args.supervisor_out.exists())


if __name__=="__main__":
    unittest.main()
