"""Offline tests only; never fetch FeenWay or write product data."""
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE))
from v7_multisource.feenway_actions_pilot import PilotRejected, validate_urls, robots_gate, run

U = "https://www.feenway.com/listings/239051"


class FeenwayActionsPilotTests(unittest.TestCase):
    def test_one_valid_url(self):
        self.assertEqual(validate_urls([U]), [U])

    def test_ten_accepted(self):
        self.assertEqual(len(validate_urls([f"https://www.feenway.com/listings/{n}" for n in range(10,20)])), 10)

    def test_more_than_ten_rejected(self):
        with self.assertRaises(PilotRejected):
            validate_urls([f"https://www.feenway.com/listings/{n}" for n in range(10,21)])

    def test_duplicate_rejected(self):
        with self.assertRaises(PilotRejected): validate_urls([U, U])

    def test_external_domain_rejected(self):
        with self.assertRaises(PilotRejected):
            validate_urls(["https://www.feenway.com.evil.test/listings/239051"])

    def test_http_rejected(self):
        with self.assertRaises(PilotRejected): validate_urls([U.replace("https:", "http:")])

    def test_query_rejected(self):
        with self.assertRaises(PilotRejected): validate_urls([U + "?foo=bar"])

    def test_robots_allow(self):
        self.assertTrue(robots_gate("User-agent: *\nAllow: /listings/\n", [U])["listing_routes_allowed"])

    def test_robots_disallow(self):
        with self.assertRaisesRegex(PilotRejected, "ROBOTS_DISALLOWS"):
            robots_gate("User-agent: *\nDisallow: /listings/\n", [U])

    def test_robot_agent_override(self):
        with self.assertRaisesRegex(PilotRejected, "ROBOTS_DISALLOWS"):
            robots_gate("User-agent: *\nAllow: /\nUser-agent: Akarfinder-Source-Evidence\nDisallow: /listings/\n", [U])

    def test_robots_unavailable_text(self):
        with self.assertRaisesRegex(PilotRejected, "ROBOTS_POLICY"):
            robots_gate("<html>access denied</html>", [U])

    def test_robots_crawl_delay_fails_closed(self):
        with self.assertRaisesRegex(PilotRejected, "CRAWL_DELAY"):
            robots_gate("User-agent: *\nAllow: /\nCrawl-delay: 5\n", [U])

    def test_network_gate_fails_before_output(self):
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "out"
            with patch.dict("os.environ", {}, clear=True):
                with self.assertRaisesRegex(PilotRejected, "NETWORK_GATE"):
                    run([U], dest, approved=True)
            self.assertFalse(dest.exists())

    def test_plan_does_not_allow_private_output_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "out"
            dest.mkdir()
            with patch.dict("os.environ", {"AKAR_SOURCE_NETWORK_APPROVED": "approved"}):
                with self.assertRaisesRegex(PilotRejected, "MUST_BE_NEW"):
                    run([U], dest, approved=True)


if __name__ == "__main__":
    unittest.main()
