"""Real V646 authenticated OFFLINE snapshot -> V3 bulk, without live requests.

V646 source is checked out at a pinned SHA in a separate hermetic CI job.
The ordinary V3 regression skips this test when that checkout is absent.
"""
from __future__ import annotations

from datetime import datetime, timezone
import gzip
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import akarparser_v3_raw_bulk as v3
from akarparser_v3_v646_bridge import bridge_v646_row

V646_ROOT = os.environ.get("V646_OFFLINE_DIR", "").strip()


@unittest.skipUnless(V646_ROOT, "Standalone V646 pinned checkout not available")
class AuthenticatedV646ToV3(unittest.TestCase):
    def test_real_offline_v646_producer_export_to_actual_v3_bulk(self):
        root = Path(V646_ROOT).resolve()
        self.assertTrue((root / "akarfinder_scraper.py").is_file())
        sys.path.insert(0, str(root))
        sys.path.insert(0, str(root / "tests"))
        import akarfinder_scraper as scraper
        from test_v646_round4_authenticated_snapshots import scratch, offline_main

        with scratch():
            self.assertEqual(offline_main(), 0)
            with scraper.read_verified_publication() as proof:
                raw = proof.read_export("akarfinder_data.json")
                self.assertEqual(
                    proof.db.execute("SELECT count(*) FROM listings").fetchone()[0],
                    len(json.loads(raw)),
                )
                records = json.loads(raw)
                self.assertGreater(len(records), 0)
                candidates = [bridge_v646_row(row) for row in records]
                self.assertEqual(len(candidates), len(records))
                for row in candidates:
                    self.assertNotIn("observed_at", row)
                    self.assertNotIn("published_at", row)

        with tempfile.TemporaryDirectory(prefix="v646-v3-offline-") as tmp:
            input_file = Path(tmp) / "bridge.jsonl"
            input_file.write_text(
                "".join(json.dumps(row, sort_keys=True) + "\n" for row in candidates),
                encoding="utf-8",
            )
            out = Path(tmp) / "v3_out"
            report = v3.run(input_file, out,
                            as_of=datetime(2026, 11, 12, 16, tzinfo=timezone.utc))
            self.assertEqual(report["input_count"], len(candidates))
            self.assertEqual(report["status_counts"].get("errors", 0), 0)
            self.assertEqual(report["status_counts"].get("ready_internal", 0), 0)
            self.assertEqual(report["safety"]["network_requests"], 0)
            self.assertEqual(report["safety"]["db_writes"], 0)
            with gzip.open(out / "all.jsonl.gz", "rt", encoding="utf-8") as f:
                parsed = [json.loads(line) for line in f if line.strip()]
            self.assertEqual(len(parsed), len(candidates))
            for item in parsed:
                self.assertFalse(item["quality"]["availability_verified"])
                self.assertFalse(item["quality"]["freshness_independently_verified"])
                self.assertFalse(item["quality"]["neon_product_admission_authorized"])
                self.assertEqual(item["fields"]["transaction_type"], "sale")


if __name__ == "__main__":
    unittest.main(verbosity=2)
