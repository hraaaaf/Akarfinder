"""V7 FeenWay immutable HTML snapshot -> quarantined original-link observation.

Only supplied local raw HTML + existing snapshot_evidence.verify_evidence().
Never crawls sites or proves the upstream ad is available/correct/authorized.
"""
from __future__ import annotations

from html.parser import HTMLParser
import re
from pathlib import Path
from urllib.parse import urlsplit

from v7_multisource.snapshot_evidence import verify_evidence

FEENWAY = re.compile(r"https://www\.feenway\.com/listings/([1-9][0-9]{0,11})\Z")
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
SOURCE_LABELS = {
    "avito.ma": "avito", "mubawab.ma": "mubawab", "agenz.ma": "agenz",
    "yakeey.com": "yakeey", "sarouty.ma": "sarouty", "masaken.ma": "masaken",
}


class LinkEvidenceRejected(ValueError):
    pass


class _PageLinks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_head = False
        self.canonicals: list[str | None] = []
        self.ogs: list[str | None] = []
        self._active_href: str | None = None
        self._active_text: list[str] = []
        self.links: list[tuple[str, str]] = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "head":
            self.in_head = True
        if self.in_head:
            if tag == "link" and "canonical" in (attrs_dict.get("rel") or "").lower().split():
                self.canonicals.append(attrs_dict.get("href"))
            if tag == "meta" and (attrs_dict.get("property") or "").lower() == "og:url":
                self.ogs.append(attrs_dict.get("content"))
        if tag == "a":
            if self._active_href is not None:
                raise LinkEvidenceRejected("NESTED_ANCHOR_INVALID")
            self._active_href = attrs_dict.get("href") or ""
            self._active_text = []

    def handle_data(self, data):
        if self._active_href is not None:
            self._active_text.append(data)

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False
        if tag == "a" and self._active_href is not None:
            label = " ".join(" ".join(self._active_text).split()).casefold()
            self.links.append((self._active_href, label))
            self._active_href = None
            self._active_text = []


def _source_identity(raw: str) -> tuple[str, str, str]:
    if not isinstance(raw, str) or not 20 <= len(raw) <= 2048 or "\\" in raw:
        raise LinkEvidenceRejected("UPSTREAM_URL_INVALID")
    try:
        p = urlsplit(raw)
        port = p.port
    except ValueError as exc:
        raise LinkEvidenceRejected("UPSTREAM_URL_INVALID") from exc
    host = p.hostname or ""
    clean_host = host[4:] if host.startswith("www.") else host
    if (p.scheme != "https" or clean_host not in SOURCE_LABELS
            or p.netloc not in {clean_host, "www." + clean_host}
            or p.username or p.password or port is not None or p.fragment
            or "//" in p.path or not p.path.startswith("/")
            or re.search(r"%(?:2f|5c|00|25)", p.path, re.I)):
        raise LinkEvidenceRejected("UNSAFE_UPSTREAM_URL")
    if p.query and not (clean_host == "sarouty.ma"
                        and p.path.rstrip("/") == "/property-details"
                        and re.fullmatch(r"listing_id=[0-9]{5,9}", p.query)):
        raise LinkEvidenceRejected("UNSAFE_UPSTREAM_QUERY")
    if clean_host == "mubawab.ma":
        m = re.fullmatch(r"/fr/a/([0-9]{5,12})(?:/[^/?#]+)?/?", p.path)
    elif clean_host == "avito.ma":
        m = re.fullmatch(r"/fr/[^?#]+_([0-9]{7,12})\.htm", p.path)
    elif clean_host == "agenz.ma":
        m = re.fullmatch(r"/fr/annonces/immo-[^/?#]+/(?:vente|location)-[^/?#]+/[^/?#]+/([0-9]{5,12})/?", p.path)
    elif clean_host == "yakeey.com":
        m = re.fullmatch(r"/fr-ma/[^/?#]+-([a-z]{2}[0-9]{5,8})/?", p.path)
    elif clean_host == "sarouty.ma":
        m = re.fullmatch(r"listing_id=([0-9]{5,9})", p.query) if p.path.rstrip("/") == "/property-details" else None
    else:
        m = re.fullmatch(r"/fr/immobilier-maroc/[^/?#]+/([0-9]{4,12})/?", p.path)
    if not m:
        raise LinkEvidenceRejected("UNSUPPORTED_UPSTREAM_DETAIL_ID")
    return clean_host, m.group(1), raw


def review_feenway_snapshot(*, folder: Path, expected_html_sha256: str) -> dict:
    """Fail closed. A matching HTML hash and link do NOT authenticate network origin."""
    if not isinstance(folder, Path) or folder.is_symlink() or not isinstance(expected_html_sha256, str):
        raise LinkEvidenceRejected("INVALID_EVIDENCE_INPUT")
    if SHA256.fullmatch(expected_html_sha256) is None:
        raise LinkEvidenceRejected("EXPECTED_SHA256_REQUIRED")
    data = verify_evidence(folder / "source.html", folder / "source.manifest.json")
    manifest, raw = data["manifest"], data["raw_html"]
    feenway_url = manifest["source_url"]
    m = FEENWAY.fullmatch(feenway_url)
    if not m:
        raise LinkEvidenceRejected("FEENWAY_INDIVIDUAL_URL_REQUIRED")
    if manifest["html_sha256"] != expected_html_sha256:
        raise LinkEvidenceRejected("EXTERNAL_SHA256_PIN_MISMATCH")
    parser = _PageLinks()
    parser.feed(raw)
    parser.close()
    if parser.canonicals != [feenway_url] or any(x != feenway_url for x in parser.ogs):
        raise LinkEvidenceRejected("FEENWAY_CANONICAL_MISMATCH")
    labeled = [(href, label) for href, label in parser.links if label.startswith("voir sur ")]
    if len(labeled) != 1:
        raise LinkEvidenceRejected("UNIQUE_ORIGINAL_ANCHOR_REQUIRED")
    host, original_id, url = _source_identity(labeled[0][0])
    if labeled[0][1] != "voir sur " + SOURCE_LABELS[host]:
        raise LinkEvidenceRejected("SOURCE_LABEL_HOST_CONFLICT")
    return {
        "feenway_url": feenway_url,
        "feenway_offer_id": m.group(1),
        "feenway_html_sha256_verified": expected_html_sha256,
        "observed_upstream_url": url,
        "upstream_domain_hint": host,
        "upstream_offer_id_hint": original_id,
        "capture_time_claim": manifest["captured_at_utc"],
        "evidence_kind": "SUPPLIED_HTML_SELF_DECLARED_LINK_QUARANTINE_ONLY",
        "capture_origin_independently_authenticated": False,
        "upstream_detail_checked": False,
        "upstream_price_or_period_verified": False,
        "eligible_for_radar10_private_staging": False,
        "eligible_for_public_admission": False,
        "network_requests": 0,
        "db_writes": 0,
    }
