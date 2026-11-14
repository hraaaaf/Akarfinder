"""J5 actual merged L8 Node result -> REAL V3 in-memory, URL-only.
All URL strings are synthetic. No source HTTP, no DB, no publication.
"""
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys
import unittest

ACQUISITION=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ACQUISITION))
from v7_multisource.legacy_url_intake import (
    UrlOnlyContractError, inspect_url_only_candidates,
)

NOW=datetime(2026,11,13,12,20,tzinfo=timezone.utc)
NODE=r"""
import {assessJ5} from './scripts/acquisition/v7_parallel/j5_remaining_portals.mjs';
import {adaptLegacyReports} from './scripts/acquisition/v7_multisource/legacy_candidate_bridge.mjs';
const report=urls=>({zeroDbWrites:true,stoppedEarly:null,listingUrls:urls});
const mub=Array.from({length:600},(_,i)=>'https://www.mubawab.ma/fr/a/'+(9961000+i)+'/flat');
const mar=Array.from({length:400},(_,i)=>'https://www.marocannonces.com/annonce/'+(987654+i)+'/appartement.html');
const sources={'marocannonces.com':report(mar),'mubawab.ma':report(mub)};
const j5=assessJ5(sources);
const bridge=adaptLegacyReports(sources);
process.stdout.write(JSON.stringify({j5,bridgeRecords:bridge.records}));
"""


class J5ActualV3HandoffTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root=ACQUISITION.parents[1]
        try:
            run=subprocess.run(
                ["node","--input-type=module","-e",NODE],cwd=root,
                text=True,capture_output=True,check=True,timeout=30)
            cls.payload=json.loads(run.stdout)
        except (OSError,subprocess.CalledProcessError,
                subprocess.TimeoutExpired,json.JSONDecodeError) as exc:
            raise AssertionError("J5_REAL_L8_NODE_TO_V3_SETUP_FAILED") from exc

    def test_1000_raw_urls_are_identical_in_j5_and_actual_l8_bridge(self):
        j5=self.payload["j5"]
        rows=self.payload["bridgeRecords"]
        self.assertEqual(j5["raw_source_url_count"],1000)
        self.assertEqual(j5["candidates_count"],1000)
        self.assertEqual(len(rows),1000)
        expected={(r["source_domain"],r["source_offer_id"],r["source_url"])
                  for r in rows}
        actual={(r["portal"],r["source_offer_id"],r["source_url"])
                for r in j5["source_url_candidates"]}
        self.assertEqual(expected,actual)
        self.assertEqual(j5["candidate_counts_by_source"],
                         {"mubawab.ma":600,"marocannonces.com":400})
        self.assertTrue(all(not r["source_report_authenticated"]
                            and not r["original_html_sha256_verified"]
                            for r in j5["source_url_candidates"]))
        self.assertEqual(j5["unintegrated"],[
            "masaken.ma","immoneuf.avito.ma","immo.mitula.ma",
            "maportail-immobilier.ma"])

    def test_actual_v3_quarantines_all_1000_merged_candidates(self):
        preview=inspect_url_only_candidates(self.payload["bridgeRecords"],as_of=NOW)
        self.assertEqual(preview["input_url_candidates"],1000)
        self.assertEqual(preview["v3_source_snippet_only"],1000)
        self.assertEqual(preview["source_counts"],
                         {"marocannonces.com":400,"mubawab.ma":600})
        self.assertEqual(preview["detail_records_admitted"],0)
        self.assertEqual(preview["private_radar_candidates_inserted"],0)
        self.assertEqual(preview["production_writes"],0)
        self.assertEqual(preview["network_requests"],0)
        self.assertFalse(preview["public_admission_authorized"])

    def test_no_forged_detail_or_publication_metadata_can_enter_v3(self):
        item=dict(self.payload["bridgeRecords"][0])
        item["editorial_published_at"]="2026-11-13T12:00:00Z"
        with self.assertRaises(UrlOnlyContractError):
            inspect_url_only_candidates([item],as_of=NOW)
        item=dict(self.payload["bridgeRecords"][0])
        item["eligible_for_private_detail_staging"]=True
        with self.assertRaises(UrlOnlyContractError):
            inspect_url_only_candidates([item],as_of=NOW)


if __name__=="__main__":
    unittest.main()
