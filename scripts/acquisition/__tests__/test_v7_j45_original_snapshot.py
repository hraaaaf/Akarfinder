"""Offline source HTML replay for J4 and J5. Synthetic fixtures only."""
from datetime import datetime,timezone
from pathlib import Path
import json
import sys
import tempfile
import unittest

BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE))
from v7_multisource.snapshot_evidence import _manifest,EvidenceError
from v7_multisource.legacy_url_intake import SCHEMA
from v7_parallel.j45_original_snapshot import review_original_snapshot,OriginalSnapshotRejected

UTC=datetime(2026,11,13,9,30,tzinfo=timezone.utc)
URLS={
"avito.ma":"https://www.avito.ma/fr/casablanca/appartements/test_12345678.htm",
"sarouty.ma":"https://www.sarouty.ma/fr/plp/acheter/appartement-avec-balcon-123456.html",
"mubawab.ma":"https://www.mubawab.ma/fr/a/9961000/flat",
"marocannonces.com":"https://www.marocannonces.com/annonce/987654/appartement.html",
}
IDS={"avito.ma":"12345678","sarouty.ma":"123456","mubawab.ma":"9961000",
"marocannonces.com":"987654"}
HTML=("""<!DOCTYPE html><html><head><title>Appartement à vendre - 850 000 DH</title>
<script type="application/ld+json">{"@type":"Apartment","name":"Appartement à vendre",
"offers":{"price":850000,"priceCurrency":"MAD"},
"floorSize":{"value":90,"unitCode":"MTK"},
"address":{"addressLocality":"Rabat","streetAddress":"Agdal"}}</script>
</head><body><h1>Appartement à vendre à Rabat</h1>
<p>850 000 DH</p><p>90 m²</p><p>Rabat Agdal</p></body></html>""").encode("utf-8")

def candidate(source,url=None):
    return {
        "schema_version":SCHEMA,"source_domain":source,
        "source_offer_id":IDS[source],"source_url":url or URLS[source],
        "discovery_method":"existing_l8_collector_result_offline",
        "record_kind":"url_candidate_only","detail_observed":False,
        "editorial_published_at":None,"rights_verified":False,
        "source_currently_active":None,
        "eligible_for_private_detail_staging":False,
        "eligible_for_public_admission":False,
    }

class J45SourceTests(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.folder=Path(tmp.name)

    def write(self,url,html=HTML):
        (self.folder/"source.html").write_bytes(html)
        self.manifest=_manifest(url,html,when=UTC,method="explicit_single_page_https_get")
        (self.folder/"source.manifest.json").write_text(json.dumps(self.manifest),encoding="utf-8")

    def gate(self,source,lane=None,record=None,pin=None):
        return review_original_snapshot(
            lane=lane or ("j4" if source in ("avito.ma","sarouty.ma") else "j5"),
            candidate=record if record is not None else candidate(source),
            folder=self.folder,
            expected_html_sha256=pin if pin is not None else self.manifest["html_sha256"])

    def test_four_real_l8_validators_used_on_synthetic_html(self):
        for source,url in URLS.items():
            with self.subTest(source=source):
                self.write(url)
                r=self.gate(source)
                self.assertEqual(r["source_domain"],source)
                self.assertEqual(len(r["l4_v3_fields"]),7)
                self.assertTrue(r["html_sha256_verified"])
                self.assertFalse(r["external_pin_registry_authenticated"])
                self.assertFalse(r["eligible_for_private_detail_staging"])
                self.assertFalse(r["eligible_for_public_admission"])
                self.assertEqual((r["source_network_requests"],r["db_writes"]),(0,0))

    def test_forged_offer_id_rejected(self):
        self.write(URLS["avito.ma"])
        c=candidate("avito.ma")
        c["source_offer_id"]="12345679"
        with self.assertRaisesRegex(OriginalSnapshotRejected,"SOURCE_URL_ID_CONTRADICTION"):
            self.gate("avito.ma",record=c)

    def test_cross_lane_rejected(self):
        self.write(URLS["marocannonces.com"])
        with self.assertRaisesRegex(OriginalSnapshotRejected,"LANE_SOURCE_MISMATCH"):
            self.gate("marocannonces.com",lane="j4")

    def test_exact_manifest_url_required(self):
        self.write(URLS["mubawab.ma"].replace("9961000","9961001"))
        with self.assertRaisesRegex(OriginalSnapshotRejected,"CAPTURE_URL_MISMATCH"):
            self.gate("mubawab.ma")

    def test_modified_source_bytes_rejected(self):
        self.write(URLS["mubawab.ma"])
        (self.folder/"source.html").write_bytes(HTML+b" ")
        with self.assertRaises(EvidenceError):
            self.gate("mubawab.ma")

    def test_missing_or_wrong_capture_pin_rejected(self):
        self.write(URLS["marocannonces.com"])
        with self.assertRaisesRegex(OriginalSnapshotRejected,"EXTERNAL_SHA_PIN_REQUIRED"):
            self.gate("marocannonces.com",pin="")
        with self.assertRaisesRegex(OriginalSnapshotRejected,"CAPTURE_PIN_MISMATCH"):
            self.gate("marocannonces.com",pin="f"*64)

    def test_search_url_not_individual_offer(self):
        url="https://www.mubawab.ma/fr/cc/immobilier-a-vendre"
        self.write(url)
        with self.assertRaisesRegex(OriginalSnapshotRejected,"L8_SOURCE_ID_REJECTED"):
            self.gate("mubawab.ma",record=candidate("mubawab.ma",url))

    def test_forged_staging_approval_rejected(self):
        self.write(URLS["sarouty.ma"])
        c=candidate("sarouty.ma")
        c["eligible_for_private_detail_staging"]=True
        with self.assertRaisesRegex(OriginalSnapshotRejected,"URL_ONLY_SAFETY_CONTRACT_FAILED"):
            self.gate("sarouty.ma",record=c)

    def test_cross_site_url_spoofing_rejected(self):
        self.write(URLS["avito.ma"])
        with self.assertRaisesRegex(OriginalSnapshotRejected,"L8_SOURCE_ID_REJECTED"):
            self.gate("sarouty.ma",record=candidate("sarouty.ma",URLS["avito.ma"]))

    def test_extra_provenance_claim_rejected(self):
        self.write(URLS["avito.ma"])
        c=candidate("avito.ma")
        c["publication_date"]="2026-11-13"
        with self.assertRaisesRegex(OriginalSnapshotRejected,"URL_ONLY_SAFETY_CONTRACT_FAILED"):
            self.gate("avito.ma",record=c)

if __name__=="__main__":
    unittest.main()
