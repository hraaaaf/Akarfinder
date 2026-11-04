"""Adversarial regression suite for the V6.4.6 review (CLAUDE_V646_REVIEW.md).

Provenance of fixtures
  SYNTHETIC  : built from tests/test_parser_evidence.card(); NOT a Mubawab capture.
  REAL-DOM   : sanitized DOM of the Rabat page dated 2026-11-01 (kept in earlier
               packages, NOT in the review pack). Tests are skipped unless the
               environment variable AKAR_REAL_DOM points to that file.
Tests marked expectedFailure describe PROPOSED behaviour that no patch implements
yet: remove the decorator when the proposal is implemented.
"""
import asyncio, contextlib, io, json, os, re, sqlite3, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import akarfinder_scraper as s
import benchmark_evidence as ev
import live_canary as lc
from test_parser_evidence import SYNTHETIC_MODERN, card

REAL_DOM = os.environ.get("AKAR_REAL_DOM")
needs_real = unittest.skipUnless(REAL_DOM and Path(REAL_DOM).exists(), "set AKAR_REAL_DOM to the sanitized 2026-11-01 DOM")


def page(*cards: str) -> str:
    return "<html><body>" + "".join(cards) + "</body></html>"


class _Session429:
    def __init__(self, code): self.calls, self.code = 0, code
    async def get(self, url, **kw):
        self.calls += 1
        return type("R", (), {"status_code": self.code, "text": ""})()


class AccessPolicy(unittest.TestCase):
    """SYNTHETIC. Mission item 4: 403/429 fail-closed."""
    def _fetch(self, code):
        session = _Session429(code)
        with patch.object(s.asyncio, "sleep", new=AsyncMock()):
            result = asyncio.run(s.fetch_page(session, s.BASE_URL, asyncio.Semaphore(1)))
        return session, result

    def test_http_429_is_terminal_and_sends_exactly_one_request(self):
        session, result = self._fetch(429)
        self.assertEqual((session.calls, result.status, result.code), (1, "blocked", 429))

    def test_http_403_is_terminal_and_sends_exactly_one_request(self):
        session, result = self._fetch(403)
        self.assertEqual((session.calls, result.status), (1, "blocked"))

    def test_blocked_result_is_never_escalated_to_the_browser(self):
        self.assertFalse(s.needs_browser_fallback(s.FetchResult("u", "blocked", code=403, attempts=1)))
        self.assertFalse(s.needs_browser_fallback(s.FetchResult("u", "blocked", code=429, attempts=1)))

    def test_http_200_without_rendered_cards_still_uses_the_browser(self):
        empty = s.FetchResult("u", "ok", html="<html><body><div id='app'></div></body></html>", code=200, attempts=1)
        self.assertTrue(s.needs_browser_fallback(empty))

    def test_5xx_is_retried_with_bounded_attempts(self):
        session, result = self._fetch(503)
        self.assertEqual((session.calls, result.status), (s.MAX_RETRIES, "http_error"))


class CanaryEvidence(unittest.TestCase):
    """SYNTHETIC. Mission items 4 and 6: a green job must mean a parsed quality page."""
    def _exit_code(self, status):
        async def fake_probe(source_url=s.BASE_URL): return {"canary_status": status}
        with tempfile.TemporaryDirectory() as tmp, patch.object(lc, "probe", fake_probe), \
                patch.object(sys, "argv", ["canary", "--output", tmp + "/o.json"]), \
                contextlib.redirect_stdout(io.StringIO()):
            return lc.main()

    def test_only_parsed_quality_pass_exits_zero(self):
        self.assertEqual(self._exit_code("parsed_quality_pass"), 0)
        for status in ("blocked_or_no_useful_html", "parsed_quality_fail",
                       "robots_or_admission_blocked", "runtime_error", "not_started"):
            with self.subTest(status=status):
                self.assertNotEqual(self._exit_code(status), 0)

    def test_summary_exposes_source_ids_for_net_new_computation(self):
        summary = lc.summarise_html(SYNTHETIC_MODERN)
        self.assertEqual(summary["observed_source_ids"], ["7800001", "7800002", "7800003"])
        self.assertEqual(len(summary["observed_source_ids_sha256"]), 64)

    def test_failed_or_legacy_observations_cannot_claim_net_new(self):
        import compare_observations as co
        good = {"canary_status": "parsed_quality_pass", "html_analysis": {
            "quality_accepted": True, "observed_source_ids": ["1", "2"], "eligible_cards": 2}}
        failed = {"canary_status": "parsed_quality_fail", "html_analysis": {
            "quality_accepted": False, "observed_source_ids": ["3"], "eligible_cards": 1}}
        legacy = {"canary_status": "parsed_quality_pass", "html_analysis": {
            "quality_accepted": True, "eligible_cards": 32, "counts_for_accepted_page_only": {"unique_source_ids": 32}}}
        for previous, current in ((good, failed), (legacy, good), (good, legacy)):
            with self.subTest(previous=previous, current=current):
                with self.assertRaises(ValueError):
                    co.compare(previous, current)
        with self.assertRaises(ValueError):
            co.net_new_vs_snapshot(failed, {"1"})

    def test_counts_are_reported_even_when_the_page_fails_the_gate(self):
        failing = page(*(card(7810000 + i, price="Prix à consulter") for i in range(10)))
        summary = lc.summarise_html(failing)
        self.assertFalse(summary["quality_accepted"])
        self.assertIsNotNone(summary["counts_observed"])
        self.assertEqual(summary["counts_observed"]["unique_source_ids"], 10)

    def test_compare_observations_separates_observed_from_net_new(self):
        import compare_observations as co
        a = {"html_analysis": {"observed_source_ids": ["1", "2", "3"], "eligible_cards": 3}}
        b = {"html_analysis": {"observed_source_ids": ["2", "3", "4"], "eligible_cards": 3}}
        r = co.compare(a, b)
        self.assertEqual((r["observed_current"], r["net_new_vs_previous"], r["dropped_since_previous"], r["overlap"]), (3, 1, 1, 2))
        self.assertFalse(r["same_page_identity"])
        self.assertTrue(co.compare(a, a)["same_page_identity"])


def _run_main(cwd, html):
    async def fake_gather(urls, engine="auto", headed=False, browser_path=None, diagnostics=None):
        res = [s.FetchResult(u, "ok", html=html, code=200, attempts=1) for u in urls]
        if diagnostics is not None:
            diagnostics.extend(s.build_page_diagnostics(res, urls, [{} for _ in urls]))
        return res
    previous = os.getcwd(); os.chdir(cwd)
    try:
        with patch.object(s, "fetch_and_check_robots", lambda urls: {"status": "checked"}), \
                patch.object(s, "approved_shard_baseline", lambda url: 3), \
                patch.object(s, "gather_results", fake_gather), contextlib.redirect_stdout(io.StringIO()):
            try:
                return asyncio.run(s.main(engine="http")), None
            except BaseException as exc:
                return None, exc
    finally:
        os.chdir(previous)


class MainRobustness(unittest.TestCase):
    """SYNTHETIC. Mission item 5: crash and resume."""
    def test_unexpected_exception_returns_code_4_and_writes_a_diagnostic(self):
        with tempfile.TemporaryDirectory() as tmp:
            conn = s.init_db(str(Path(tmp) / "akarfinder.db"))
            conn.execute("INSERT INTO listings(id,title,link,transaction_type) VALUES ('7800001','x','https://www.mubawab.ma/fr/a/7800001/x','rent')")
            conn.commit(); conn.close()
            code, exc = _run_main(tmp, SYNTHETIC_MODERN)
            self.assertIsNone(exc)
            self.assertEqual(code, 4)
            report = json.loads((Path(tmp) / "akarfinder_diagnostics.json").read_text())
            self.assertIn("conflicting transaction", report["fatal_error"])

    def test_crash_after_import_then_rerun_loses_and_duplicates_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(s, "persist_price_reviews", side_effect=RuntimeError("simulated crash")):
                _run_main(tmp, SYNTHETIC_MODERN)
            code, exc = _run_main(tmp, SYNTHETIC_MODERN)
            self.assertIsNone(exc)
            conn = sqlite3.connect(Path(tmp) / "akarfinder.db")
            try:
                self.assertEqual(conn.execute("SELECT COUNT(*), COUNT(DISTINCT id) FROM listings").fetchone(), (3, 3))
            finally:
                conn.close()


class DataIntegrity(unittest.TestCase):
    """SYNTHETIC. Mission items 2 and 3: metrics must describe the current source state."""
    BASE = {"id": "7800001", "title": "t", "price_mad": 1200000, "price_source_status": "numeric",
            "surface_m2": 100.0, "rooms": 3, "bedrooms": 2, "bathrooms": 1, "district": "Agdal",
            "location": "Rabat", "link": "https://www.mubawab.ma/fr/a/7800001/x",
            "transaction_type": "sale", "source_search_url": s.BASE_URL}

    def test_numeric_then_on_request_is_not_counted_twice(self):
        conn = s.init_db(":memory:")
        s.import_listings(conn, [dict(self.BASE)])
        s.import_listings(conn, [dict(self.BASE, price_mad=None, price_source_status="on_request")])
        counts = ev.evaluate([dict(r) for r in conn.execute("SELECT * FROM listings")])
        fields = counts["fields_present_among_unique_ids"]
        self.assertEqual((fields["price_numeric"], fields["price_explicit_on_request"]), (0, 1))
        self.assertEqual(counts["stale_price_rows_with_on_request_source"], 1)

    def test_overwritten_surface_and_rooms_are_audited(self):
        conn = s.init_db(":memory:")
        s.import_listings(conn, [dict(self.BASE, surface_m2=110.0, rooms=3)])
        stats, _ = s.import_listings(conn, [dict(self.BASE, surface_m2=1100.0, rooms=30)])
        rows = conn.execute("SELECT field, old_value, new_value FROM field_change_log ORDER BY field").fetchall()
        self.assertEqual([tuple(r) for r in rows], [("rooms", "3", "30"), ("surface_m2", "110.0", "1100.0")])
        self.assertEqual(stats.field_changes, {"rooms": 1, "surface_m2": 1})


class ParserAdversarial(unittest.TestCase):
    """SYNTHETIC fixtures. Mission items 1 and 3."""
    def test_from_price_is_not_a_numeric_price(self):                       # A1
        self.assertIsNone(s.parse_price("À partir de 1 200 000 DH"))
        audit = s.parse_listings_audited(page(*(card(7820000 + i, price="À partir de 1 200 000 DH") for i in range(10))))
        self.assertEqual(audit.price_recognition_coverage, 0.0)
        self.assertFalse(audit.passes_quality)
        self.assertIn("price_coverage_below_threshold", audit.quality_reasons)

    def test_rent_style_price_is_never_read_as_a_sale_price(self):          # A2
        self.assertIsNone(s.parse_price("8 000 DH/mois"))
        self.assertEqual(s.price_source_status("8 000 DH/mois", None), "missing_or_unrecognized")

    def test_ambiguous_and_locale_prices(self):                             # A3
        cases = {"125.000 MAD": 125000, "1,25 MDH": 1250000, "2 500 000\u202fDH": 2500000, "2 500 000 dh": 2500000,
                 "1.500 MDH": None, "1 000-2 000 DH": None, "٢٥٠٠٠٠٠ DH": None, "2.500.000,00 DH": 2500000, "1 2500 000 DH": None}
        for raw, expected in cases.items():
            with self.subTest(raw=raw):
                self.assertEqual(s.parse_price(raw), expected)

    def test_masked_prices_everywhere_fail_closed(self):                    # A4 (soft-block)
        audit = s.parse_listings_audited(page(*(card(7830000 + i, price="Prix à consulter") for i in range(10))))
        self.assertFalse(audit.passes_quality)
        self.assertIn("excessive_on_request_prices", audit.quality_reasons)

    def test_same_key_ids_are_flagged_never_merged(self):                   # A5
        rows = s.parse_listings(card(7840001) + card(7840002))
        for row in rows: row["transaction_type"] = "sale"
        self.assertEqual(s.flag_possible_duplicates(rows), {"7840001": ["7840002"], "7840002": ["7840001"]})
        self.assertEqual(len({r["id"] for r in rows}), 2)

    def test_known_false_negative_surface_off_by_one(self):                 # A6 characterization
        rows = s.parse_listings(card(7850001, surface="273 m²") + card(7850002, surface="274 m²", title="Autre titre"))
        for row in rows: row["transaction_type"] = "sale"
        # Exact-key matching misses a +/-1 m2 pair seen in real data. Characterizes the limit; a fuzzy matcher flips it.
        self.assertEqual(s.flag_possible_duplicates(rows), {})

    def test_challenge_page_without_cards_is_rejected(self):                # A7
        audit = s.parse_listings_audited("<html><body><h1>Checking your browser before accessing</h1></body></html>")
        self.assertEqual(audit.rejected, {"challenge_page": 1})
        self.assertEqual(audit.listings, [])

    def test_villa_in_apartment_shard_is_typed_not_assumed(self):           # A8 proposal R6
        row = s.parse_listings(card(7860001, title="Villa à vendre Souissi"))[0]
        self.assertEqual(row["property_type_observed"], "villa")

    def test_truncated_page_is_flagged_against_a_baseline(self):            # A9 proposal R5
        cut = page(*(card(7870000 + i) for i in range(12)))
        audit = s.parse_listings_audited(cut, baseline_eligible_cards=32)
        self.assertFalse(audit.passes_quality)

    def test_locality_is_required_even_if_the_modern_marker_disappears(self):  # A10 proposal R5
        legacy = page(*(card(7880000 + i, modern=False) for i in range(10)))
        audit = s.parse_listings_audited(legacy, require_locality=True)
        self.assertFalse(audit.passes_quality)


class ZeroProductionWrite(unittest.TestCase):
    """SYNTHETIC. Mission item 8: `production_db_writes: 0` is a literal in the JSON; prove it by behaviour."""
    def test_canary_success_path_never_opens_sqlite_and_exits_zero(self):
        import browser_fetcher
        class FakeBrowser:
            def __init__(self, *a, **k): pass
            def network_policy_evidence(self): return {"policy": "synthetic_mock", "blocked_requests": 0}
            async def __aenter__(self): return self
            async def __aexit__(self, *a): return False
            async def fetch(self, url): return s.FetchResult(url, "ok", html=SYNTHETIC_MODERN, code=200, attempts=1)
        def forbidden(*a, **k): raise AssertionError("sqlite3.connect called by the canary")
        async def fake_probe_wrapper():
            return await lc.probe()
        with patch.object(lc, "fetch_and_check_robots", lambda urls: {"status": "checked", "sha256": "x", "checked_at_utc": "t", "rule_count": 1}), \
                patch.object(lc, "approved_shard_baseline", lambda url: 3), \
                patch.object(browser_fetcher, "BrowserFetcher", FakeBrowser), patch.object(sqlite3, "connect", forbidden):
            report = asyncio.run(lc.probe())
        self.assertEqual(report["canary_status"], "parsed_quality_pass")
        self.assertEqual(report["production_db_writes"], 0)


@needs_real
class RealDomReplay(unittest.TestCase):
    """REAL-DOM (sanitized Rabat page, 2026-11-01), not part of the review pack."""
    @classmethod
    def setUpClass(cls):
        cls.html = Path(REAL_DOM).read_text(encoding="utf-8")
        cls.audit = s.parse_listings_audited(cls.html)

    def test_real_counts_match_the_live_canary_aggregates(self):
        a = self.audit
        self.assertEqual((a.total_cards, a.eligible_cards, len(a.listings)), (34, 32, 32))
        self.assertEqual(a.ignored, {"promotion_without_detail_link": 1, "empty_placeholder": 1})
        c = ev.evaluate(a.listings)
        self.assertEqual(c["fields_present_among_unique_ids"]["price_numeric"], 29)
        self.assertEqual(c["fields_present_among_unique_ids"]["price_explicit_on_request"], 3)
        self.assertEqual(c["complete_core_with_district"], 32)

    def test_real_page_candidate_duplicates_and_signals(self):
        rows = [dict(r, transaction_type="sale") for r in self.audit.listings]
        self.assertEqual(s.flag_possible_duplicates(rows), {"8321289": ["8432780"], "8432780": ["8321289"]})
        signals = {r["id"]: r["quality_signals"] for r in rows if r["quality_signals"]}
        self.assertEqual(signals["8397179"], ["possible_non_residential"])

    def test_real_dom_double_marker_drift_must_fail_the_locality_gate(self):
        drift = self.html.replace('listingTit"', 'listingTitle"').replace("listingTit ", "listingTitle ").replace('class="listingH3"', 'class="x"')
        self.assertFalse(s.parse_listings_audited(drift, require_locality=True).passes_quality)

    def test_real_dom_cut_after_17_cards_must_not_look_complete(self):
        starts = [m.start() for m in re.finditer(r'<div class="listingBox', self.html)]
        audit = s.parse_listings_audited(self.html[:starts[17]], baseline_eligible_cards=32)
        self.assertFalse(audit.passes_quality)


if __name__ == "__main__":
    unittest.main()
