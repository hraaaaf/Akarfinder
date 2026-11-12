"""Actual V646 offline signer -> verified CLI reader -> V3 -> Radar10 dry-run.

All source data is synthetic and all producer secrets are test-only.
"""
import os
from pathlib import Path
import shutil
import sys
import unittest

ACQUISITION = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ACQUISITION))
from radar10 import run_cycle

V646_DIR = os.environ.get("V646_OFFLINE_DIR", "")


@unittest.skipUnless(V646_DIR, "Pinned authenticated V646 fixture missing")
class FullRadar10DryRun(unittest.TestCase):
    def test_authenticated_producer_through_current_runner(self):
        source = Path(V646_DIR).resolve()
        self.assertTrue((source / "akarfinder_scraper.py").is_file())
        sys.path.insert(0, str(source))
        sys.path.insert(0, str(source / "tests"))
        from test_v646_round4_authenticated_snapshots import scratch, offline_main
        with scratch() as private:
            self.assertEqual(offline_main(), 0)
            for file in source.glob("*.py"):
                shutil.copy2(file, private / file.name)
            result = run_cycle.perform(private, collect=False, commit=False)
            self.assertEqual(result["status"], "dry_run")
            self.assertGreater(result["accepted"], 0)
            self.assertEqual(result["observed"], result["accepted"])
            self.assertEqual(result["rejected"], {})
            self.assertEqual(result["duplicates"], 0)
            self.assertEqual(result["db_writes"], 0)
            self.assertEqual(result["publication_writes"], 0)
            self.assertEqual(result["production_writes"], 0)


if __name__ == "__main__":
    unittest.main()
