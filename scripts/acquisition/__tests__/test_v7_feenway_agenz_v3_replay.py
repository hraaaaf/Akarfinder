"""Agenz original source one-shot replay: offline adversarial tests only."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_multisource.feenway_agenz_v3_replay import (
    AGENZ_URL, PINNED_FEENWAY_URL, one_agenz_candidate, run, UpstreamAuditRejected,
)

INPUT = json.loads((Path(__file__).resolve().parents[1] / "v7_multisource" /
                    "feenway_upstream_10_candidates.json").read_text(encoding="utf-8"))
CASE = one_agenz_candidate(INPUT)


def page():
    return (f'<!doctype html><html><head><title>Appartement à louer à Marrakech</title>'
            f'<link rel="canonical" href="{AGENZ_URL}"><meta property="og:url" content="{AGENZ_URL}">'
            '<meta property="og:title" content="Appartement à louer à Marrakech"></head>'
            '<body><h1>Appartement à louer à Marrakech</h1></body></html>').encode("utf-8")


class AgenzReplayTests(unittest.TestCase):
    def test_pinned_case_identity(self):
        self.assertEqual(CASE["feenway_url"], PINNED_FEENWAY_URL)
        self.assertEqual(CASE["source_offer_id_hint"], "169490")

    def test_wrong_source_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            broken = dict(CASE, original_url="https://www.avito.ma/fr/foo/12345678.htm")
            with self.assertRaisesRegex(UpstreamAuditRejected, "WRONG_ORIGIN"):
                run(broken, Path(tmp) / "out", approved=True)

    def test_reject_before_network_without_approval(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.dict("os.environ", {}, clear=True), \
                patch("v7_multisource.feenway_agenz_v3_replay._get") as get:
                with self.assertRaisesRegex(UpstreamAuditRejected, "NETWORK_GATE"):
                    run(CASE, Path(tmp) / "out", approved=True)
                get.assert_not_called()

    def test_no_output_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out"; out.mkdir()
            with patch.dict("os.environ", {"AKAR_SOURCE_NETWORK_APPROVED": "approved"}):
                with self.assertRaisesRegex(UpstreamAuditRejected, "OUTPUT_MUST_BE_NEW"):
                    run(CASE, out, approved=True)

    def test_single_original_get_and_v3_fields(self):
        with tempfile.TemporaryDirectory() as tmp, \
            patch.dict("os.environ", {"AKAR_SOURCE_NETWORK_APPROVED": "approved"}), \
            patch("v7_multisource.feenway_agenz_v3_replay._robots_policy", return_value="f"*64) as robots, \
            patch("v7_multisource.feenway_agenz_v3_replay._get", return_value=(200,"text/html",page())) as get:
            out = Path(tmp) / "out"
            result = run(CASE, out, approved=True)
        robots.assert_called_once_with("agenz.ma", [AGENZ_URL])
        get.assert_called_once_with(AGENZ_URL, max_bytes=2_000_000, accept="text/html")
        self.assertTrue(result["source_canonical_id_claim_matches"])
        self.assertEqual(result["v3"]["status"], "V3_PARSER_OBSERVATION_ONLY")
        self.assertEqual(result["v3"]["fields"]["transaction_type"], "rent")
        self.assertEqual(result["v3"]["fields"]["property_type"], "apartment")
        self.assertFalse(result["public_admission_authorized"])

    def test_agenz_source_conflict_reaches_actual_v3_review_queue(self):
        from v7_multisource.feenway_agenz_primary_scope import evidence
        html = (f'<!doctype html><html><head><title>Appartement à louer</title>'
                f'<link rel="canonical" href="{AGENZ_URL}">'
                f'<meta property="og:url" content="{AGENZ_URL}"></head>'
                '<body><main><h1>Appartement à louer</h1>'
                '<section><h2>Description</h2>'
                '<p>Location longue durée : 7 700 DH / mois</p></section>'
                '<section><h2>Caractéristiques</h2><ul><li>Surface84 m²</li></ul></section>'
                '<section><h2>Coût mensuel</h2>7 500DH / mois'
                '<p>Loyer mensuel 7 500 DH</p></section>'
                '</main></body></html>')
        self.assertTrue(evidence(html)["primary_price_description_conflict"])
        with tempfile.TemporaryDirectory() as tmp, \
            patch.dict("os.environ", {"AKAR_SOURCE_NETWORK_APPROVED": "approved"}), \
            patch("v7_multisource.feenway_agenz_v3_replay._robots_policy", return_value="a"*64), \
            patch("v7_multisource.feenway_agenz_v3_replay._get", return_value=(200,"text/html",html.encode("utf-8"))):
            result = run(CASE, Path(tmp)/"out", approved=True)
        self.assertTrue(result["source_price_conflict_needs_manual_review"])
        self.assertEqual(result["v3"]["quality_status"], "requires_manual_review")
        self.assertTrue(result["v3"]["human_review_required"])
        self.assertIn("AGENZ_PRIMARY_VS_DESCRIPTION_RENT_PRICE_CONFLICT",
                      result["v3"]["review_reasons"])
        self.assertFalse(result["public_admission_authorized"])

    def test_robots_denied_never_gets_detail(self):
        with tempfile.TemporaryDirectory() as tmp, \
            patch.dict("os.environ", {"AKAR_SOURCE_NETWORK_APPROVED": "approved"}), \
            patch("v7_multisource.feenway_agenz_v3_replay._robots_policy", side_effect=UpstreamAuditRejected("ROBOTS_DENIED")), \
            patch("v7_multisource.feenway_agenz_v3_replay._get") as get:
            result = run(CASE, Path(tmp) / "out", approved=True)
            get.assert_not_called()
            self.assertEqual(result["status"], "SOURCE_CHECK_UNAVAILABLE")
            self.assertEqual(result["database_writes"], 0)

    def test_empty_html_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp, \
            patch.dict("os.environ", {"AKAR_SOURCE_NETWORK_APPROVED": "approved"}), \
            patch("v7_multisource.feenway_agenz_v3_replay._robots_policy", return_value="e"*64), \
            patch("v7_multisource.feenway_agenz_v3_replay._get", return_value=(200,"text/html",b"")):
            result = run(CASE, Path(tmp) / "out", approved=True)
            self.assertEqual(result["status"], "SOURCE_CHECK_UNAVAILABLE")
            self.assertFalse(result["source_canonical_id_claim_matches"])

    def test_no_bulk_list(self):
        tampered = json.loads(json.dumps(INPUT))
        row = next(x for x in tampered if x["source_domain_hint"] == "agenz.ma")
        row["original_url"] = row["original_url"].replace("169490", "169491")
        row["source_offer_id_hint"] = "169491"
        with self.assertRaisesRegex(UpstreamAuditRejected, "EXACT_AGENZ_CASE_REQUIRED"):
            one_agenz_candidate(tampered)


if __name__ == "__main__":
    unittest.main()
