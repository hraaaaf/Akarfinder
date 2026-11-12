"""Real existing L8 JS module output -> V7 URL queue -> actual V3 quarantine."""
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from v7_multisource.legacy_url_intake import (
    UrlOnlyContractError, inspect_url_only_candidates,
)

NOW = datetime(2026, 11, 12, 17, tzinfo=timezone.utc)
SCRIPT = r"""
import { adaptLegacyReports } from './scripts/acquisition/v7_multisource/legacy_candidate_bridge.mjs';
const urls = {
  'agenz.ma': 'https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810',
  'avito.ma': 'https://www.avito.ma/fr/casablanca/appartements/test_12345678.htm',
  'sarouty.ma': 'https://www.sarouty.ma/fr/plp/acheter/appartement-avec-balcon-123456.html',
  'mubawab.ma': 'https://www.mubawab.ma/fr/a/9961000/flat',
  'marocannonces.com': 'https://www.marocannonces.com/annonce/987654/appartement.html',
};
const result = adaptLegacyReports(Object.fromEntries(
 Object.entries(urls).map(([source, url]) =>
   [source, { zeroDbWrites: true, stoppedEarly: null, listingUrls: [url] }])));
process.stdout.write(JSON.stringify(result.records));
"""


class BridgeToV3Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = HERE.parents[1]
        try:
            run = subprocess.run(
                ["node", "--input-type=module", "-e", SCRIPT],
                cwd=root, capture_output=True, text=True, check=True, timeout=15,
            )
        except (subprocess.CalledProcessError, OSError) as exc:
            raise AssertionError("OFFLINE_LEGACY_NODE_HANDOFF_FAILED") from exc
        cls.rows = json.loads(run.stdout)

    def test_actual_node_merged_helpers_to_actual_v3_stays_url_only(self):
        result = inspect_url_only_candidates(self.rows, as_of=NOW)
        self.assertEqual(result["input_url_candidates"], 5)
        self.assertEqual(result["v3_source_snippet_only"], 5)
        self.assertEqual(result["detail_records_admitted"], 0)
        self.assertEqual(result["private_radar_candidates_inserted"], 0)
        self.assertEqual(result["production_writes"], 0)
        self.assertEqual(result["network_requests"], 0)
        self.assertEqual(sorted(result["source_counts"]), [
            "agenz.ma", "avito.ma", "marocannonces.com", "mubawab.ma", "sarouty.ma",
        ])

    def test_reject_forged_detail_and_time_fields(self):
        item = dict(self.rows[0], detail_observed=True)
        with self.assertRaises(UrlOnlyContractError):
            inspect_url_only_candidates([item], as_of=NOW)
        item = dict(self.rows[0], editorial_published_at="2026-11-12T09:00:00Z")
        with self.assertRaises(UrlOnlyContractError):
            inspect_url_only_candidates([item], as_of=NOW)
        item = dict(self.rows[0], price_mad=1)
        with self.assertRaises(UrlOnlyContractError):
            inspect_url_only_candidates([item], as_of=NOW)

    def test_reject_duplicate_source_ids(self):
        with self.assertRaisesRegex(UrlOnlyContractError, "DUPLICATE_SOURCE_ID"):
            inspect_url_only_candidates(self.rows + [self.rows[0]], as_of=NOW)

    def test_reject_feenway_unapproved_domain(self):
        bad = dict(self.rows[0], source_domain="feenway.com")
        with self.assertRaises(UrlOnlyContractError):
            inspect_url_only_candidates([bad], as_of=NOW)

    def test_no_public_or_private_staging_on_empty_batch(self):
        report = inspect_url_only_candidates([], as_of=NOW)
        self.assertEqual(report["input_url_candidates"], 0)
        self.assertEqual(report["private_radar_candidates_inserted"], 0)
        self.assertFalse(report["public_admission_authorized"])


if __name__ == "__main__":
    unittest.main()
