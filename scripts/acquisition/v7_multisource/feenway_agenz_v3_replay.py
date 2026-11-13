#!/usr/bin/env python3
"""One Agenz original source replay in GitHub Actions, strictly quarantine-only.

Same original listing already accepted by the V7 original-portal robots gate.
Do not fetch any blocked or unknown original domain, avoid repeating 10-site run.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
from urllib import error

from v7_multisource.feenway_agenz_primary_scope import evidence as agenz_primary_evidence
from v7_multisource.feenway_upstream_10_audit import (
    MAX_HTML_BYTES, UpstreamAuditRejected, _get, _robots_policy,
    _source_parser_summary, inspect_identity, compare_claims, validate_candidates,
)

AGENZ_URL = "https://agenz.ma/fr/annonces/immo-marrakech/location-appartements/route-de-casablanca/169490"
PINNED_FEENWAY_URL = "https://www.feenway.com/listings/186197"


def one_agenz_candidate(all_candidates):
    rows = validate_candidates(all_candidates)
    filtered = [item for item in rows if item["source_domain_hint"] == "agenz.ma"]
    if len(filtered) != 1 or filtered[0]["original_url"] != AGENZ_URL or filtered[0]["feenway_url"] != PINNED_FEENWAY_URL:
        raise UpstreamAuditRejected("EXACT_AGENZ_CASE_REQUIRED")
    return filtered[0]


def run(candidate, out: Path, *, approved: bool):
    if candidate["original_url"] != AGENZ_URL or candidate["feenway_url"] != PINNED_FEENWAY_URL:
        raise UpstreamAuditRejected("WRONG_ORIGIN")
    if not approved or os.getenv("AKAR_SOURCE_NETWORK_APPROVED") != "approved":
        raise UpstreamAuditRejected("EXPLICIT_ONESHOT_NETWORK_GATE_REQUIRED")
    if out.exists() or out.is_symlink():
        raise UpstreamAuditRejected("OUTPUT_MUST_BE_NEW")
    out.mkdir(mode=0o700, parents=True)
    report = {
        "schema_version": "akarfinder-feenway-agenz-v3-replay-v1",
        "feenway_url": candidate["feenway_url"],
        "source_url": AGENZ_URL,
        "expected_source_id_hint": candidate["source_offer_id_hint"],
        "original_http_status": None,
        "source_raw_html_sha256": None,
        "source_canonical_id_claim_matches": False,
        "v3": {"status": "NOT_EXECUTED", "fields": {}},
        "comparisons": {},
        "status": "ROBOTS_OR_HTTP_UNAVAILABLE",
        "error_class": None,
        "verified_listing_availability": False,
        "verified_price_period": False,
        "verified_physical_uniqueness": False,
        "eligible_for_radar10_private_staging": False,
        "public_admission_authorized": False,
        "database_writes": 0,
    }
    try:
        _robots_policy("agenz.ma", [AGENZ_URL])
        status, content_type, raw = _get(AGENZ_URL, max_bytes=MAX_HTML_BYTES, accept="text/html")
        report["original_http_status"] = status
        if status != 200 or not content_type.lower().startswith("text/html"):
            raise UpstreamAuditRejected("RESPONSE_NOT_200_HTML")
        if not raw.lstrip().lower().startswith((b"<!doctype html", b"<html")):
            raise UpstreamAuditRejected("NOT_RAW_HTML_DOCUMENT")
        html = raw.decode("utf-8", "strict")
        report["source_raw_html_sha256"] = hashlib.sha256(raw).hexdigest()
        identity = inspect_identity(html, AGENZ_URL)
        report["status"] = identity["status"]
        report["source_canonical_id_claim_matches"] = identity["status"] == "SOURCE_CANONICAL_ID_MATCH"
        if report["source_canonical_id_claim_matches"]:
            scope = agenz_primary_evidence(html)
            reason = ("AGENZ_PRIMARY_VS_DESCRIPTION_RENT_PRICE_CONFLICT",)
            v3_reasons = reason if scope["primary_price_description_conflict"] else ()
            v3 = _source_parser_summary(AGENZ_URL, html,
                                        source_review_reasons=v3_reasons)
            report["v3"] = v3
            report["comparisons"] = compare_claims(candidate["feenway_claim"], identity, v3)
            report["primary_source_scope"] = scope
            report["source_price_conflict_needs_manual_review"] = bool(
                scope["primary_price_description_conflict"])
            # Never report a V3 passing state if the source conflict was
            # detected but failed to propagate to the actual V3 quality gate.
            if v3_reasons and (v3.get("status") != "V3_PARSER_OBSERVATION_ONLY"
                               or not v3.get("human_review_required")
                               or reason[0] not in v3.get("review_reasons", [])
                               or v3.get("quality_status") != "requires_manual_review"):
                raise UpstreamAuditRejected("V3_PRICE_CONFLICT_REVIEW_PROPAGATION_FAILED")
    except (UpstreamAuditRejected, error.HTTPError, error.URLError, TimeoutError, UnicodeError) as exc:
        report["status"] = "SOURCE_CHECK_UNAVAILABLE"
        report["error_class"] = type(exc).__name__
        if isinstance(exc, error.HTTPError):
            report["original_http_status"] = exc.code
    finally:
        report["observed_at_utc"] = datetime.now(timezone.utc).isoformat()
        (out / "agenz_replay_QUARANTINE.json").write_text(
            json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return report


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--candidates", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--approved-one", action="store_true")
    args = p.parse_args()
    candidate = one_agenz_candidate(json.loads(args.candidates.read_text(encoding="utf-8")))
    result = run(candidate, args.output, approved=args.approved_one)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
