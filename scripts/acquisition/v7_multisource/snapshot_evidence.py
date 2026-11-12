"""V7 raw HTML source-evidence capture and offline benchmark (no DB).

Capture is a deliberate, explicitly gated ONE-page operation, never a crawler.
Verification of SHA256, HTTP status and timestamps is offline. Real source
validity, permission, freshness, and availability are NOT proven by the hash.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import ssl
import urllib.error
import urllib.request
from urllib.parse import urlsplit

from detail_compare import _domain, compare_supplied_html, DetailBenchmarkError

MAX_RAW_HTML_BYTES = 2_000_000
MAX_MANIFEST_BYTES = 12_000
REQUIRED = frozenset({
    "schema_version", "source_url", "captured_at_utc", "http_status",
    "content_type", "html_sha256", "bytes", "capture_method",
})
SCHEMA_VERSION = "akarfinder-v7-raw-html-evidence-v1"


class EvidenceError(ValueError):
    pass


def _url(url: str) -> str:
    try:
        _domain(url)
        parsed = urlsplit(url)
    except (DetailBenchmarkError, ValueError) as exc:
        raise EvidenceError("INVALID_SOURCE_URL") from exc
    if (not isinstance(url, str) or not (24 <= len(url) <= 2048)
            or parsed.query or parsed.fragment or parsed.username or parsed.password
            or parsed.netloc not in {
                "feenway.com", "www.feenway.com", "agenz.ma", "www.agenz.ma",
                "avito.ma", "www.avito.ma", "yakeey.com", "www.yakeey.com",
                "sarouty.ma", "www.sarouty.ma",
                "mubawab.ma", "www.mubawab.ma",
                "marocannonces.com", "www.marocannonces.com",
            }
            or parsed.path in ("/", "")):
        raise EvidenceError("UNSUPPORTED_SOURCE_URL")
    return url


def _utc(s: str) -> datetime:
    if not isinstance(s, str) or not s.endswith("Z"):
        raise EvidenceError("UTC_REQUIRED")
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError as exc:
        raise EvidenceError("INVALID_TIMESTAMP") from exc
    if dt.utcoffset() != timezone.utc.utcoffset(dt):
        raise EvidenceError("UTC_REQUIRED")
    return dt


def _manifest(url: str, raw: bytes, *, when: datetime, method: str) -> dict:
    if (when.tzinfo is None or when.utcoffset().total_seconds() != 0
            or not raw.startswith((b"<!doctype html", b"<!DOCTYPE html", b"<html", b"<HTML"))
            or len(raw) > MAX_RAW_HTML_BYTES):
        raise EvidenceError("INVALID_RAW_CAPTURE")
    try:
        raw.decode("utf-8", errors="strict")
    except UnicodeError as exc:
        raise EvidenceError("UTF8_REQUIRED") from exc
    return {
        "schema_version": SCHEMA_VERSION,
        "source_url": _url(url),
        "captured_at_utc": when.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "http_status": 200,
        "content_type": "text/html; charset=utf-8",
        "html_sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw),
        "capture_method": method,
    }


def verify_evidence(html_file: Path, manifest_file: Path) -> dict:
    """Verify byte-identical capture; never use a server-rendered excerpt."""
    if (html_file.is_symlink() or manifest_file.is_symlink()
            or not html_file.is_file() or not manifest_file.is_file()
            or html_file.stat().st_size > MAX_RAW_HTML_BYTES
            or manifest_file.stat().st_size > MAX_MANIFEST_BYTES):
        raise EvidenceError("EVIDENCE_MISSING_OR_UNSAFE")
    raw = html_file.read_bytes()
    try:
        manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise EvidenceError("INVALID_MANIFEST") from exc
    if not isinstance(manifest, dict) or set(manifest) != REQUIRED:
        raise EvidenceError("INVALID_MANIFEST_FIELDS")
    _url(manifest["source_url"])
    _utc(manifest["captured_at_utc"])
    if (manifest["schema_version"] != SCHEMA_VERSION
            or manifest["http_status"] != 200
            or not isinstance(manifest["content_type"], str)
            or not manifest["content_type"].lower().startswith("text/html")
            or manifest["capture_method"] != "explicit_single_page_https_get"
            or not isinstance(manifest["bytes"], int)
            or isinstance(manifest["bytes"], bool)
            or manifest["bytes"] != len(raw)
            or not re.fullmatch(r"[a-f0-9]{64}", str(manifest["html_sha256"]))
            or hashlib.sha256(raw).hexdigest() != manifest["html_sha256"]):
        raise EvidenceError("EVIDENCE_INTEGRITY_FAILED")
    if not raw.startswith((b"<!doctype html", b"<!DOCTYPE html", b"<html", b"<HTML")):
        raise EvidenceError("NOT_RAW_HTML_DOCUMENT")
    try:
        decoded = raw.decode("utf-8", errors="strict")
    except UnicodeError as exc:
        raise EvidenceError("UTF8_REQUIRED") from exc
    return {"manifest": manifest, "raw_html": decoded}


def offline_benchmark(html_file: Path, manifest_file: Path) -> dict:
    data = verify_evidence(html_file, manifest_file)
    m = data["manifest"]
    result = compare_supplied_html(
        {"source_url": m["source_url"], "raw_html": data["raw_html"],
         "observation_ref": m["html_sha256"]},
        as_of=_utc(m["captured_at_utc"]),
    )
    return {
        "evidence_verified": True, "raw_sha256": m["html_sha256"],
        "capture_method": m["capture_method"], "captured_at_utc": m["captured_at_utc"],
        "field_comparison": result["field_comparison"],
        "conflicting_nonempty_fields": result["conflicting_nonempty_fields"],
        "v3_quality_status": result["v3_quality_status"],
        "source_network_requests": 0, "db_writes": 0,
        "availability_verified": False, "public_admission_authorized": False,
        "real_fields_ground_truthed": False,
    }


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise EvidenceError("REDIRECT_REQUIRES_SEPARATE_REVIEW")


def capture_approved_once(url: str, folder: Path, *, approved: bool = False) -> dict:
    """At most one HTTPS GET, under separate explicit runtime+CLI approval."""
    _url(url)
    if not approved or os.getenv("AKAR_SOURCE_NETWORK_APPROVED") != "approved":
        raise EvidenceError("EXPLICIT_NETWORK_GO_REQUIRED")
    if folder.exists() or folder.is_symlink():
        raise EvidenceError("CAPTURE_FOLDER_MUST_BE_NEW")
    # No redirects, proxy interception, cookies, browser automation, challenge
    # bypass or retries. TLS verification is default, checked by urllib.
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Akarfinder-Source-Evidence/0.1 (+operator-approved)",
                 "Accept": "text/html", "Accept-Encoding": "identity"},
        method="GET",
    )
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({}), _NoRedirect(),
        urllib.request.HTTPSHandler(context=ssl.create_default_context()),
    )
    with opener.open(request, timeout=12) as response:
        if response.status != 200:
            raise EvidenceError("HTTP_NON_200")
        ct = response.headers.get("Content-Type", "").lower()
        if not ct.startswith("text/html") or "charset=" in ct and "utf-8" not in ct:
            raise EvidenceError("UNSUPPORTED_CONTENT_TYPE")
        raw = response.read(MAX_RAW_HTML_BYTES + 1)
    manifest = _manifest(
        url, raw, when=datetime.now(timezone.utc),
        method="explicit_single_page_https_get",
    )
    folder.mkdir(parents=True, mode=0o700)
    html_file = folder / "source.html"
    manifest_file = folder / "source.manifest.json"
    with html_file.open("xb") as f:
        f.write(raw)
    manifest_file.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    os.chmod(html_file, 0o600)
    os.chmod(manifest_file, 0o600)
    verify_evidence(html_file, manifest_file)
    return {"capture_sha256": manifest["html_sha256"], "bytes": manifest["bytes"],
            "http_status": 200, "stored_private_locally": True,
            "db_writes": 0, "public_admission_authorized": False}


def main() -> int:
    cli = argparse.ArgumentParser()
    group = cli.add_mutually_exclusive_group(required=True)
    group.add_argument("--verify-folder", type=Path)
    group.add_argument("--capture-url")
    cli.add_argument("--private-output", type=Path)
    cli.add_argument("--capture-approved-once", action="store_true")
    args = cli.parse_args()
    if args.capture_url:
        if not args.private_output:
            cli.error("--private-output required for capture")
        summary = capture_approved_once(
            args.capture_url, args.private_output, approved=args.capture_approved_once)
    else:
        root = args.verify_folder
        summary = offline_benchmark(root / "source.html", root / "source.manifest.json")
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
