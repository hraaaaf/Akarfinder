#!/usr/bin/env python3
"""One-shot FeenWay V7 GitHub Actions pilot: max 10 pages, no admission or DB."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import ssl
from urllib import error, request, robotparser

FEENWAY = re.compile(r"https://www\.feenway\.com/listings/[1-9][0-9]{0,11}\Z")
USER_AGENT = "Akarfinder-Source-Evidence/0.1 (+operator-approved)"
ROBOTS_URL = "https://www.feenway.com/robots.txt"
MAX_URLS = 10


class PilotRejected(ValueError):
    pass


class _NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise PilotRejected("REDIRECT_DISALLOWED")


def validate_urls(urls: object) -> list[str]:
    if (not isinstance(urls, list) or not 1 <= len(urls) <= MAX_URLS
            or any(not isinstance(url, str) or FEENWAY.fullmatch(url) is None for url in urls)
            or len(set(urls)) != len(urls)):
        raise PilotRejected("PILOT_URL_COUNT_OR_HOST_INVALID")
    return urls


def robots_gate(raw: str, urls: list[str]) -> dict:
    validate_urls(urls)
    if not isinstance(raw, str) or len(raw.encode("utf-8")) > 250_000 or "user-agent:" not in raw.lower():
        raise PilotRejected("ROBOTS_POLICY_MISSING_OR_INVALID")
    parsed = robotparser.RobotFileParser()
    parsed.parse(raw.splitlines())
    if not all(parsed.can_fetch(USER_AGENT, url) for url in urls):
        raise PilotRejected("ROBOTS_DISALLOWS_LISTING")
    delay = parsed.crawl_delay(USER_AGENT)
    if delay is not None and delay > 0:
        raise PilotRejected("ROBOTS_CRAWL_DELAY_REQUIRES_SEPARATE_PACING")
    return {"policy_sha256": hashlib.sha256(raw.encode("utf-8")).hexdigest(),
            "listing_routes_allowed": True, "crawl_delay": delay}


def _opener():
    return request.build_opener(request.ProxyHandler({}), _NoRedirect(),
                                request.HTTPSHandler(context=ssl.create_default_context()))


def fetch_robots() -> str:
    req = request.Request(ROBOTS_URL,
                          headers={"User-Agent": USER_AGENT, "Accept": "text/plain"}, method="GET")
    with _opener().open(req, timeout=10) as response:
        if response.status != 200:
            raise PilotRejected("ROBOTS_UNAVAILABLE")
        data = response.read(250_001)
    if len(data) > 250_000:
        raise PilotRejected("ROBOTS_TOO_LARGE")
    return data.decode("utf-8", errors="strict")


def run(urls: list[str], out: Path, *, approved: bool) -> dict:
    urls = validate_urls(urls)
    if not approved or os.getenv("AKAR_SOURCE_NETWORK_APPROVED") != "approved":
        raise PilotRejected("EXPLICIT_GITHUB_ACTIONS_NETWORK_GATE_REQUIRED")
    if out.exists() or out.is_symlink():
        raise PilotRejected("OUTPUT_DIR_MUST_BE_NEW")
    out.mkdir(parents=True, mode=0o700)
    result = {"schema_version": "akarfinder-feenway-actions-pilot-v1",
              "mode": "ONE_SHOT_PRIVATE_QUARANTINE_ONLY", "planned_urls": len(urls),
              "policy_sha256": None, "checked_pages": 0, "formatted_source_links": 0,
              "upstream_pages_independently_checked": 0,
              "eligible_for_public_admission": 0, "database_writes": 0,
              "observations": [], "blocked_reason": None}
    try:
        try:
            robot_policy = robots_gate(fetch_robots(), urls)
        except (PilotRejected, error.HTTPError, error.URLError, TimeoutError, UnicodeError) as exc:
            result["blocked_reason"] = "ROBOTS_PRECONDITION_FAILED:" + type(exc).__name__
            raise PilotRejected(result["blocked_reason"]) from exc
        result["policy_sha256"] = robot_policy["policy_sha256"]
        from v7_multisource.snapshot_evidence import capture_approved_once
        from v7_multisource.feenway_snapshot_links import review_feenway_snapshot
        for index, url in enumerate(urls):
            folder = out / f"page_{index + 1:02d}"
            try:
                capture = capture_approved_once(url, folder, approved=True)
                result["checked_pages"] += 1
                try:
                    observed = review_feenway_snapshot(
                        folder=folder, expected_html_sha256=capture["capture_sha256"])
                    result["formatted_source_links"] += 1
                    record = {"feenway_url": url, "status": "FORMATTED_LINK_QUARANTINED",
                              "html_sha256": capture["capture_sha256"],
                              "observed_upstream_url": observed["observed_upstream_url"],
                              "upstream_offer_id_hint": observed["upstream_offer_id_hint"],
                              "upstream_domain_hint": observed["upstream_domain_hint"]}
                except ValueError:
                    record = {"feenway_url": url, "status": "EVIDENCE_FORMAT_REJECTED",
                              "html_sha256": capture["capture_sha256"]}
            except (error.HTTPError, error.URLError, TimeoutError, ValueError) as exc:
                record = {"feenway_url": url, "status": "SOURCE_FETCH_UNAVAILABLE",
                          "error_class": type(exc).__name__}
                if isinstance(exc, error.HTTPError) and exc.code in (401, 403, 429):
                    result["observations"].append(record)
                    result["blocked_reason"] = "SOURCE_ACCESS_RESTRICTED_HTTP_" + str(exc.code)
                    break
            result["observations"].append(record)
    finally:
        result["observed_at_utc"] = datetime.now(timezone.utc).isoformat()
        (out / "report_QUARANTINE.json").write_text(
            json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
        with (out / "observations_QUARANTINE.jsonl").open("w", encoding="utf-8") as f:
            for row in result["observations"]:
                f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    if result["blocked_reason"]:
        raise PilotRejected(result["blocked_reason"])
    return result


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--urls", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--approved-10", action="store_true")
    a = p.parse_args()
    urls = validate_urls(json.loads(a.urls.read_text(encoding="utf-8")))
    result = run(urls, a.output, approved=a.approved_10)
    print(json.dumps({k: v for k, v in result.items() if k != "observations"}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
