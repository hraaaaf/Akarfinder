#!/usr/bin/env python3
"""Bounded check of 10 original portal pages linked by FeenWay.

No portal discovery, redirects, retries, proxies, cookie/session, DB, cron,
merges, publication, asset copies, or claim that an ad is currently available.
Per-portal robots gate before one detail GET, quarantine-only JSON results.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import ssl
from urllib import error, request, robotparser
from urllib.parse import urlsplit, urlunsplit, quote

from v7_multisource.feenway_snapshot_links import _source_identity
from v7_multisource.feenway_actions_pilot import FEENWAY, USER_AGENT

MAX_ITEMS, MAX_DOMAINS = 10, 6
MAX_HTML_BYTES, MAX_ROBOTS_BYTES = 2_000_000, 250_000
PARSER_HOSTS = frozenset(("avito.ma", "mubawab.ma", "agenz.ma", "yakeey.com", "sarouty.ma"))
BAD_HEADLINE = re.compile(r"just a moment|access denied|captcha|security check|robot check|checking your browser", re.I)
AMOUNT_RE = re.compile(r"\b([0-9]{1,3}(?:[\s\u00a0][0-9]{3})+|[0-9]{3,12})\s*(?:MAD|DH|DHS)\b", re.I)


class UpstreamAuditRejected(ValueError):
    pass


class _NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise UpstreamAuditRejected("HTTP_REDIRECT_FORBIDDEN")


class _Head(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_head = self.in_title = self.in_h1 = False
        self.canonicals, self.ogs, self.titles, self.headlines, self.meta_titles = [], [], [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        tag = tag.lower()
        if tag == "head": self.in_head = True
        elif tag == "title" and self.in_head: self.in_title = True
        elif tag == "h1": self.in_h1 = True
        if self.in_head and tag == "link" and "canonical" in (a.get("rel") or "").lower().split():
            self.canonicals.append(a.get("href") or "")
        if self.in_head and tag == "meta":
            key = (a.get("property") or a.get("name") or "").lower()
            if key == "og:url": self.ogs.append(a.get("content") or "")
            if key == "og:title": self.meta_titles.append(a.get("content") or "")

    def handle_endtag(self, tag):
        if tag.lower() == "head": self.in_head = False
        if tag.lower() == "title": self.in_title = False
        if tag.lower() == "h1": self.in_h1 = False

    def handle_data(self, data):
        if self.in_title: self.titles.append(data)
        if self.in_h1: self.headlines.append(data)


def validate_candidates(items):
    if not isinstance(items, list) or len(items) != MAX_ITEMS:
        raise UpstreamAuditRejected("EXACTLY_TEN_CANDIDATES_REQUIRED")
    seen_f, seen_o, domains = set(), set(), set()
    for item in items:
        if not isinstance(item, dict) or set(item) != {
            "feenway_url", "feenway_html_sha256", "original_url", "source_offer_id_hint",
            "source_domain_hint", "feenway_claim",
        }: raise UpstreamAuditRejected("INVALID_CANDIDATE_SCHEMA")
        f, url, claim = item["feenway_url"], item["original_url"], item["feenway_claim"]
        if not isinstance(f, str) or FEENWAY.fullmatch(f) is None:
            raise UpstreamAuditRejected("INVALID_FEENWAY_URL")
        if not isinstance(item["feenway_html_sha256"], str) or not re.fullmatch(r"[a-f0-9]{64}", item["feenway_html_sha256"]):
            raise UpstreamAuditRejected("INVALID_PREVIOUS_CAPTURE_SHA")
        try:
            domain, source_id, original = _source_identity(url)
        except ValueError as exc:
            raise UpstreamAuditRejected("INVALID_SOURCE_URL") from exc
        if domain != item["source_domain_hint"] or source_id != item["source_offer_id_hint"]:
            raise UpstreamAuditRejected("SOURCE_URL_ID_INCONSISTENT")
        if not isinstance(claim, dict) or set(claim) != {"title", "city", "district", "surface", "price"}:
            raise UpstreamAuditRejected("INVALID_FEENWAY_CLAIM")
        if any(not isinstance(v, str) or len(v) > 500 for v in claim.values()):
            raise UpstreamAuditRejected("INVALID_FEENWAY_FIELD")
        if f in seen_f or original in seen_o:
            raise UpstreamAuditRejected("DUPLICATE_CANDIDATE")
        seen_f.add(f); seen_o.add(original); domains.add(domain)
    if len(domains) != MAX_DOMAINS:
        raise UpstreamAuditRejected("EXPECTED_SIX_PORTALS")
    return items


def check_robots(raw, user_agent, urls):
    if not isinstance(raw, str) or not raw or len(raw.encode("utf-8")) > MAX_ROBOTS_BYTES or "user-agent:" not in raw.lower():
        raise UpstreamAuditRejected("ROBOTS_MISSING_OR_INVALID")
    policy = robotparser.RobotFileParser()
    policy.parse(raw.splitlines())
    if not all(policy.can_fetch(user_agent, u) for u in urls):
        raise UpstreamAuditRejected("ROBOTS_DENIES_ORIGINAL_DETAIL")
    if policy.crawl_delay(user_agent) not in (None, 0):
        raise UpstreamAuditRejected("ROBOTS_DELAY_UNSUPPORTED")
    if policy.request_rate(user_agent) is not None:
        raise UpstreamAuditRejected("ROBOTS_REQUEST_RATE_UNSUPPORTED")
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _wire_url(url: str):
    """Encode Unicode path for urllib; preserve the exact vetted portal offer ID."""
    p = urlsplit(url)
    encoded = urlunsplit((p.scheme, p.netloc, quote(p.path, safe="/%._~-"), p.query, ""))
    if p.path != "/robots.txt":
        if _source_identity(url)[:2] != _source_identity(encoded)[:2]:
            raise UpstreamAuditRejected("TRANSPORT_URL_CHANGED_SOURCE_ID")
    return encoded


def _get(url: str, *, max_bytes: int, accept: str):
    r = request.Request(_wire_url(url), method="GET", headers={"User-Agent": USER_AGENT,
            "Accept": accept, "Accept-Encoding": "identity"})
    opener = request.build_opener(request.ProxyHandler({}), _NoRedirect(),
                                 request.HTTPSHandler(context=ssl.create_default_context()))
    with opener.open(r, timeout=12) as response:
        data = response.read(max_bytes + 1)
        if len(data) > max_bytes: raise UpstreamAuditRejected("REMOTE_BODY_TOO_LARGE")
        return response.status, response.headers.get("Content-Type", ""), data


def _robots_policy(domain, urls):
    host = urlsplit(urls[0]).netloc
    status, content_type, data = _get("https://" + host + "/robots.txt",
                                       max_bytes=MAX_ROBOTS_BYTES, accept="text/plain")
    if status != 200 or not content_type.lower().startswith("text/plain"):
        raise UpstreamAuditRejected("ROBOTS_NOT_PLAIN_200")
    return check_robots(data.decode("utf-8", "strict"), USER_AGENT, urls)


def inspect_identity(raw_html: str, expected_url: str):
    domain, ident, _ = _source_identity(expected_url)
    parser = _Head()
    parser.feed(raw_html); parser.close()
    all_claims = parser.canonicals + parser.ogs
    headline = " ".join(" ".join(parser.headlines or parser.meta_titles or parser.titles).split())[:300]
    if BAD_HEADLINE.search(" ".join(parser.titles + parser.meta_titles)[:400]):
        return {"status": "CHALLENGE_OR_ERROR_PAGE", "identity_claims_count": len(all_claims), "primary_headline": headline}
    if not all_claims:
        return {"status": "NO_CANONICAL_OR_OG_IDENTITY", "identity_claims_count": 0, "primary_headline": headline}
    for observed in all_claims:
        try: seen_domain, seen_ident, _ = _source_identity(observed)
        except ValueError:
            return {"status": "UNPARSABLE_SOURCE_CANONICAL", "identity_claims_count": len(all_claims), "primary_headline": headline}
        if (seen_domain, seen_ident) != (domain, ident):
            return {"status": "SOURCE_CANONICAL_CONFLICT", "identity_claims_count": len(all_claims), "primary_headline": headline}
    return {"status": "SOURCE_CANONICAL_ID_MATCH", "identity_claims_count": len(all_claims), "primary_headline": headline}


def _transaction(text):
    s = text.lower()
    sale = bool(re.search(r"\b(?:vendre|vente|à vendre|a vendre|acheter)\b", s))
    rent = bool(re.search(r"\b(?:louer|location|à louer|a louer)\b", s))
    return "sale" if sale and not rent else "rent" if rent and not sale else None


def _period(text):
    s = text.casefold()
    month = bool(re.search(r"/(?:mois|month)|\bmensuel\b|\bpar mois\b", s))
    day = bool(re.search(r"/(?:nuit|jour|night|day)|\bpar nuit\b|\bpar jour\b", s))
    return "month" if month and not day else "day" if day and not month else None


def _amount(text):
    m = AMOUNT_RE.search(text)
    return int(re.sub(r"[^\d]", "", m.group(1))) if m else None


def _source_parser_summary(url, raw_html):
    domain = (urlsplit(url).hostname or "").removeprefix("www.")
    if domain not in PARSER_HOSTS:
        return {"status": "UNSUPPORTED_IN_V3", "fields": {}}
    try:
        from akarparser_v3_raw_bulk import parse_raw
        row = parse_raw({"source_url": url, "raw_html": raw_html}, datetime.now(timezone.utc))
        e = row.get("fields") or {}
        fields = {}
        for key in ("price_mad", "surface_total_m2", "property_type", "transaction_type"):
            v = e.get(key)
            fields[key] = v if (v is None or isinstance(v, (int, float, str, bool))) else None
        q = row.get("quality") or {}
        return {"status": "V3_PARSER_OBSERVATION_ONLY", "fields": fields,
                "field_evidence_paths": {k: (row.get("field_evidence", {}).get(k) or {}).get("path") for k in fields},
                "quality_status": q.get("status"), "human_review_required": bool(q.get("human_review_required")),
                "review_reasons": [x for x in (q.get("review_reasons") or []) if isinstance(x, str)][:10]}
    except Exception as e:
        return {"status": "V3_PARSER_FAILED", "error_class": type(e).__name__, "fields": {}}


def compare_claims(claim, identity, parsed):
    observed = {}
    source_title = identity.get("primary_headline") or ""
    ft, st = _transaction(claim["title"]), _transaction(source_title)
    observed["headline_transaction"] = ("MATCH" if ft == st else "CONFLICT") if ft and st else "UNVERIFIED"
    fp, sp = _period(claim["title"]), _period(source_title)
    observed["headline_price_period"] = ("MATCH" if fp == sp else "CONFLICT") if fp and sp else "UNVERIFIED"
    ff, ss = _amount(claim["price"]), parsed.get("fields", {}).get("price_mad")
    observed["v3_price"] = ("MATCH" if ff == ss else "CONFLICT") if ff is not None and isinstance(ss, (float, int)) else "UNVERIFIED"
    area_match = re.search(r"\d+(?:[.,]\d+)?", claim["surface"])
    area = float(area_match.group(0).replace(",", ".")) if area_match else None
    src_area = parsed.get("fields", {}).get("surface_total_m2")
    observed["v3_surface"] = ("MATCH" if abs(area - src_area) < 0.51 else "CONFLICT") if area is not None and isinstance(src_area, (float, int)) else "UNVERIFIED"
    if ft and parsed.get("fields", {}).get("transaction_type") in ("sale", "rent"):
        observed["v3_transaction"] = "MATCH" if ft == parsed["fields"]["transaction_type"] else "CONFLICT"
    else: observed["v3_transaction"] = "UNVERIFIED"
    return observed


def audit(items, output: Path, *, approved: bool):
    validate_candidates(items)
    if not approved or os.getenv("AKAR_SOURCE_NETWORK_APPROVED") != "approved":
        raise UpstreamAuditRejected("EXPLICIT_GITHUB_NETWORK_GATE_REQUIRED")
    if output.exists() or output.is_symlink():
        raise UpstreamAuditRejected("OUTPUT_MUST_BE_NEW")
    output.mkdir(mode=0o700, parents=True)
    groups = {}
    for item in items: groups.setdefault(item["source_domain_hint"], []).append(item)
    rows, policy_hashes, blocked_hosts = [], {}, {}
    for host, group in groups.items():
        try:
            policy_hashes[host] = _robots_policy(host, [item["original_url"] for item in group])
        except (UpstreamAuditRejected, error.HTTPError, error.URLError, TimeoutError, UnicodeError) as exc:
            blocked_hosts[host] = "ROBOTS_GATE_FAILED_" + type(exc).__name__ + ":" + (str(exc)[:80] if isinstance(exc, UpstreamAuditRejected) else "HTTP_OR_NETWORK")
            for item in group:
                rows.append({"feenway_url": item["feenway_url"], "source_domain": host,
                             "original_url": item["original_url"], "source_offer_id_hint": item["source_offer_id_hint"],
                             "status": "ROBOTS_BLOCKED_OR_UNAVAILABLE", "error_class": type(exc).__name__,
                             "error_reason": str(exc)[:80] if isinstance(exc, UpstreamAuditRejected) else None,
                             "public_admission_authorized": False})
            continue
        for item in group:
            base = {"feenway_url": item["feenway_url"], "source_domain": host,
                    "original_url": item["original_url"], "source_offer_id_hint": item["source_offer_id_hint"],
                    "public_admission_authorized": False}
            if host in blocked_hosts:
                base["status"] = "PORTAL_ACCESS_STOPPED"; rows.append(base); continue
            try:
                status, ct, b = _get(item["original_url"], max_bytes=MAX_HTML_BYTES, accept="text/html")
                if status != 200 or not ct.lower().startswith("text/html"):
                    raise UpstreamAuditRejected("NOT_200_HTML")
                raw = b.decode("utf-8", "strict")
                if not b.lstrip().lower().startswith((b"<!doctype html", b"<html")):
                    raise UpstreamAuditRejected("NOT_HTML_DOCUMENT")
                identity = inspect_identity(raw, item["original_url"])
                parser = _source_parser_summary(item["original_url"], raw) if identity["status"] == "SOURCE_CANONICAL_ID_MATCH" else {"status": "IDENTITY_NOT_SUPPORTED", "fields": {}}
                comparisons = compare_claims(item["feenway_claim"], identity, parser)
                base.update({"status": identity["status"], "source_http_status": status,
                             "html_sha256": hashlib.sha256(b).hexdigest(),
                             "source_identity_claim_matches_expected_id": identity["status"] == "SOURCE_CANONICAL_ID_MATCH",
                             "page_identity_claims_count": identity["identity_claims_count"],
                             "original_primary_headline": identity["primary_headline"],
                             "v3": parser, "comparisons": comparisons,
                             "source_availability_independently_verified": False,
                             "source_price_period_independently_verified": False,
                             "eligible_for_radar10_private_staging": False})
            except (UpstreamAuditRejected, error.HTTPError, error.URLError, TimeoutError, UnicodeError) as exc:
                base.update({"status": "SOURCE_FETCH_UNAVAILABLE", "error_class": type(exc).__name__,
                             "source_http_code": exc.code if isinstance(exc, error.HTTPError) else None,
                             "error_reason": str(exc)[:80] if isinstance(exc, UpstreamAuditRejected) else None})
                if isinstance(exc, error.HTTPError) and exc.code in (401, 403, 429):
                    blocked_hosts[host] = "PORTAL_ACCESS_DENIED_HTTP_" + str(exc.code)
            rows.append(base)
    report = {"schema_version": "akarfinder-v7-upstream-10-check-v1",
              "mode": "ORIGINAL_PORTAL_SOURCE_OBSERVATIONS_QUARANTINE_ONLY",
              "planned_source_pages": len(items), "checked_domains": len(groups),
              "status_counts": dict(sorted(Counter(r["status"] for r in rows).items())),
              "portals_with_robots_gate_failure_or_access_block": blocked_hosts,
              "robots_policy_sha256_by_domain": policy_hashes,
              "individual_original_pages_with_canonical_id_match": sum(r.get("source_identity_claim_matches_expected_id") is True for r in rows),
              "verified_listing_availability": 0, "confirmed_property_duplicates": 0,
              "eligible_for_radar10_private_staging": 0, "public_admission_authorized": False,
              "database_writes": 0, "observed_at_utc": datetime.now(timezone.utc).isoformat()}
    (output / "upstream_report_QUARANTINE.json").write_text(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    with (output / "upstream_cases_QUARANTINE.jsonl").open("w", encoding="utf-8") as f:
        for row in rows: f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    return report


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--candidates", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--approved-10", action="store_true")
    x = p.parse_args()
    report = audit(json.loads(x.candidates.read_text(encoding="utf-8")), x.output,
                   approved=x.approved_10)
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
