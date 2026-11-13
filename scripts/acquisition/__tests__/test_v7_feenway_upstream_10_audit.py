"""Safety tests for the 10 original-portal review; never use network in tests."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_multisource.feenway_upstream_10_audit import (
    UpstreamAuditRejected, validate_candidates, check_robots, inspect_identity,
    compare_claims, audit, _transaction, _period,
)
BASE = Path(__file__).resolve().parents[1]
CASES = json.loads((BASE / "v7_multisource" / "feenway_upstream_10_candidates.json").read_text(encoding="utf-8"))


def source_html(url, *, other=None, title="Appartement à vendre"):
    from html import escape
    c = escape(other or url, quote=True)
    return (f'<!doctype html><html><head><title>{title}</title>'
            f'<link rel="canonical" href="{c}">'
            f'<meta property="og:url" content="{c}"></head>'
            f'<body><h1>{title}</h1></body></html>')


class UpstreamPilotTests(unittest.TestCase):
    def test_exactly_ten_six_sources(self):
        self.assertEqual(len(validate_candidates(CASES)), 10)
        self.assertEqual(len({x["source_domain_hint"] for x in CASES}), 6)

    def test_less_than_ten_refused(self):
        with self.assertRaisesRegex(UpstreamAuditRejected, "EXACTLY_TEN"): validate_candidates(CASES[:-1])

    def test_more_than_ten_refused(self):
        with self.assertRaisesRegex(UpstreamAuditRejected, "EXACTLY_TEN"): validate_candidates(CASES + CASES[:1])

    def test_host_spoof_refused(self):
        x = json.loads(json.dumps(CASES))
        x[0]["original_url"] = x[0]["original_url"].replace("www.avito.ma", "www.avito.ma.attacker.test")
        with self.assertRaisesRegex(UpstreamAuditRejected, "INVALID_SOURCE_URL"): validate_candidates(x)

    def test_source_id_forgery_refused(self):
        x = json.loads(json.dumps(CASES)); x[0]["source_offer_id_hint"] = "111111"
        with self.assertRaisesRegex(UpstreamAuditRejected, "INCONSISTENT"): validate_candidates(x)

    def test_duplicate_feenway_refused(self):
        x = json.loads(json.dumps(CASES)); x[1]["feenway_url"] = x[0]["feenway_url"]
        with self.assertRaisesRegex(UpstreamAuditRejected, "DUPLICATE"): validate_candidates(x)

    def test_allowed_robots(self):
        self.assertEqual(len(check_robots("User-agent: *\nAllow: /\n", "Pilot/1.0", [CASES[0]["original_url"]])), 64)

    def test_disallowed_robots(self):
        with self.assertRaisesRegex(UpstreamAuditRejected, "ROBOTS_DENIES"):
            check_robots("User-agent: *\nDisallow: /\n", "Pilot/1.0", [CASES[0]["original_url"]])

    def test_rate_robots_denied(self):
        with self.assertRaisesRegex(UpstreamAuditRejected, "REQUEST_RATE"):
            check_robots("User-agent: *\nAllow: /\nRequest-rate: 1/10\n", "Pilot/1.0", [CASES[0]["original_url"]])

    def test_crawl_delay_denied(self):
        with self.assertRaisesRegex(UpstreamAuditRejected, "ROBOTS_DELAY"):
            check_robots("User-agent: *\nAllow: /\nCrawl-delay: 5\n", "Pilot/1.0", [CASES[0]["original_url"]])

    def test_robots_html_denied(self):
        with self.assertRaisesRegex(UpstreamAuditRejected, "ROBOTS_MISSING"):
            check_robots("<html>Error</html>", "Pilot/1.0", [CASES[0]["original_url"]])

    def test_source_canonical_matches_expected_id(self):
        u = CASES[2]["original_url"]
        self.assertEqual(inspect_identity(source_html(u), u)["status"], "SOURCE_CANONICAL_ID_MATCH")

    def test_source_canonical_conflicts(self):
        u = CASES[2]["original_url"]
        self.assertEqual(inspect_identity(source_html(u, other=CASES[0]["original_url"]), u)["status"], "SOURCE_CANONICAL_CONFLICT")

    def test_source_canonical_missing(self):
        u = CASES[2]["original_url"]
        self.assertEqual(inspect_identity("<html><title>Property</title><body>Advert</body></html>", u)["status"], "NO_CANONICAL_OR_OG_IDENTITY")

    def test_challenge_not_a_detail(self):
        u = CASES[2]["original_url"]
        self.assertEqual(inspect_identity(source_html(u, title="Just a moment..."), u)["status"], "CHALLENGE_OR_ERROR_PAGE")

    def test_period_conflict_not_automatically_fixed(self):
        c = compare_claims({"title": "Villa à louer 3900 DH/mois", "price": "3900 MAD", "surface": "490 m²"},
            {"primary_headline": "Villa à louer 3900 DH/jour"},
            {"fields": {"price_mad": 3900, "surface_total_m2": 490, "transaction_type": "rent"}})
        self.assertEqual(c["headline_price_period"], "CONFLICT")
        self.assertEqual(c["v3_price"], "MATCH")

    def test_sale_rent_conflict(self):
        c = compare_claims({"title": "Appartement à vendre", "price": "160 000 MAD", "surface": "222 m²"},
            {"primary_headline": "Terrain à louer"},
            {"fields": {"price_mad": 160000, "surface_total_m2": 222, "transaction_type": "rent"}})
        self.assertEqual(c["headline_transaction"], "CONFLICT")
        self.assertEqual(c["v3_transaction"], "CONFLICT")

    def test_avito_unicode_path_encoded_without_changing_id(self):
        from v7_multisource.feenway_upstream_10_audit import _wire_url
        url = CASES[2]["original_url"]
        wire = _wire_url(url)
        self.assertIn("%C3%A0", wire)
        self.assertIn("%C2%B2", wire)
        self.assertTrue(wire.endswith("58688662.htm"))
        self.assertEqual(_wire_url("https://www.avito.ma/robots.txt"), "https://www.avito.ma/robots.txt")

    def test_mubawab_encoded_percent_preserved(self):
        from v7_multisource.feenway_upstream_10_audit import _wire_url
        self.assertEqual(_wire_url(CASES[4]["original_url"]), CASES[4]["original_url"])


    def test_real_agenz_v3_result_contract_fields_not_extracted(self):
        """A genuine V3 parse_raw returns 'fields', not 'extracted'."""
        from v7_multisource.feenway_upstream_10_audit import _source_parser_summary
        url = next(x["original_url"] for x in CASES if x["source_domain_hint"] == "agenz.ma")
        html = ('<!doctype html><html><head><title>Appartement à louer</title>'
                '<link rel="canonical" href="' + url + '"></head>'
                '<body><h1>Appartement à louer</h1></body></html>')
        actual = _source_parser_summary(url, html)
        self.assertEqual(actual["status"], "V3_PARSER_OBSERVATION_ONLY")
        self.assertEqual(actual["fields"]["transaction_type"], "rent")
        self.assertEqual(actual["fields"]["property_type"], "apartment")
        self.assertEqual(actual["fields"]["price_mad"], None)
        self.assertEqual(actual["fields"]["surface_total_m2"], None)
        self.assertTrue(str(actual["field_evidence_paths"]["transaction_type"]).startswith("agenz."))
        self.assertTrue(str(actual["field_evidence_paths"]["property_type"]).startswith("agenz."))

    def test_no_network_before_gate(self):
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "out"
            with patch.dict("os.environ", {}, clear=True), patch("v7_multisource.feenway_upstream_10_audit._get") as fetch:
                with self.assertRaisesRegex(UpstreamAuditRejected, "NETWORK_GATE"):
                    audit(CASES, dest, approved=True)
                fetch.assert_not_called()
            self.assertFalse(dest.exists())

    def test_no_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "out"; dest.mkdir()
            with patch.dict("os.environ", {"AKAR_SOURCE_NETWORK_APPROVED": "approved"}):
                with self.assertRaisesRegex(UpstreamAuditRejected, "OUTPUT_MUST_BE_NEW"):
                    audit(CASES, dest, approved=True)

    def test_six_robots_and_ten_fake_details_quarantine(self):
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "out"
            with patch.dict("os.environ", {"AKAR_SOURCE_NETWORK_APPROVED": "approved"}), \
                 patch("v7_multisource.feenway_upstream_10_audit._robots_policy", return_value="a"*64) as robots, \
                 patch("v7_multisource.feenway_upstream_10_audit._source_parser_summary", return_value={"status": "MOCK", "fields": {}}), \
                 patch("v7_multisource.feenway_upstream_10_audit._get") as get:
                get.side_effect = lambda url, **kwargs: (200, "text/html", source_html(url).encode("utf-8"))
                result = audit(CASES, dest, approved=True)
            self.assertEqual(robots.call_count, 6)
            self.assertEqual(get.call_count, 10)
            self.assertEqual(result["individual_original_pages_with_canonical_id_match"], 10)
            self.assertEqual(result["database_writes"], 0)
            self.assertFalse(result["public_admission_authorized"])
            self.assertEqual(sum(result["status_counts"].values()), 10)

    def test_robots_block_skips_all_detail_fetches(self):
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "out"
            with patch.dict("os.environ", {"AKAR_SOURCE_NETWORK_APPROVED": "approved"}), \
                 patch("v7_multisource.feenway_upstream_10_audit._robots_policy", side_effect=UpstreamAuditRejected("denied")), \
                 patch("v7_multisource.feenway_upstream_10_audit._get") as get:
                result = audit(CASES, dest, approved=True)
                get.assert_not_called()
            self.assertEqual(result["status_counts"].get("ROBOTS_BLOCKED_OR_UNAVAILABLE"), 10)
            self.assertEqual(result["verified_listing_availability"], 0)

    def test_http_403_stops_same_portal(self):
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "out"
            with patch.dict("os.environ", {"AKAR_SOURCE_NETWORK_APPROVED": "approved"}), \
                 patch("v7_multisource.feenway_upstream_10_audit._robots_policy", return_value="a"*64), \
                 patch("v7_multisource.feenway_upstream_10_audit._get") as get:
                def fake_get(url, **kwargs):
                    if "avito.ma" in url: raise HTTPError(url, 403, "Forbidden", {}, None)
                    return 200, "text/html", source_html(url).encode("utf-8")
                get.side_effect = fake_get
                result = audit(CASES, dest, approved=True)
            self.assertEqual(result["status_counts"].get("SOURCE_FETCH_UNAVAILABLE"), 1)
            self.assertEqual(result["status_counts"].get("PORTAL_ACCESS_STOPPED"), 2)


if __name__ == "__main__":
    unittest.main()
