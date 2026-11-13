"""J2 FeenWay mirror provenance — OFFLINE source evidence contract.

A mirror ID is NOT the original portal ID. A source badge is NOT an
upstream hyperlink. We accept only a single explicit original-page link,
never certify it as a fetched/current page, and never stage or publish.
"""
from __future__ import annotations
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote_to_bytes
import re

SCHEMA = "akarfinder-v7-parallel-source-v1"
MIRROR_RE = re.compile(r"/listings/([0-9]{3,12})/?\Z")
ORIGINS = frozenset(("mubawab.ma", "avito.ma", "sarouty.ma", "agenz.ma"))
CTA_RE = re.compile(r"(?:visiter|voir)\s+(?:le\s+)?(?:site\s+de\s+l['’]annonce|l['’]annonce\s+originale)|voir\s+sur\s+(?:mubawab|avito|sarouty|agenz)", re.I)


class ProvenanceError(ValueError):
    pass


class _Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.current = {"href": dict(attrs).get("href", ""), "text": ""}

    def handle_data(self, data):
        if self.current is not None:
            self.current["text"] += data

    def handle_endtag(self, tag):
        if tag == "a" and self.current is not None:
            self.links.append(self.current)
            self.current = None


def _url(value: str, hosts: frozenset[str]) -> tuple[str, str, str]:
    if not isinstance(value, str) or not 20 <= len(value) <= 2048:
        raise ProvenanceError("URL_INVALID")
    try:
        p = urlsplit(value)
        port = p.port
    except ValueError as exc:
        raise ProvenanceError("URL_INVALID") from exc
    host = p.hostname or ""
    bare = host[4:] if host.startswith("www.") else host
    if (p.scheme != "https" or bare not in hosts
        or p.username or p.password or port is not None or p.fragment
        or not p.path.startswith("/") or "//" in p.path
        or "\\" in p.path
        or p.netloc not in (host,) or p.query):
        raise ProvenanceError("URL_UNSAFE")
    # FeenWay links contain percent-encoded UTF-8 accents; prevent encoded
    # ASCII slashes, controls and percent-escape ambiguity.
    if re.search(r"%(?![0-9a-fA-F]{2})", p.path):
        raise ProvenanceError("BAD_PERCENT_ESCAPE")
    for part in re.findall(r"%([0-9a-fA-F]{2})", p.path):
        if int(part, 16) < 0x80:
            raise ProvenanceError("ENCODED_ASCII_BLOCKED")
    try:
        decoded = unquote_to_bytes(p.path).decode("utf-8")
    except UnicodeError as exc:
        raise ProvenanceError("BAD_UTF8_URL") from exc
    if any(ord(c) < 32 for c in decoded) or "\\" in decoded:
        raise ProvenanceError("URL_UNSAFE")
    return bare, p.path.rstrip("/"), value


def _original_identity(url: str) -> tuple[str, str] | None:
    try:
        domain, path, _ = _url(url, ORIGINS)
    except ProvenanceError:
        return None
    pats = {
        "mubawab.ma": r"/fr/(?:a|pa)/([0-9]{5,12})(?:/[^/]*)?",
        "avito.ma": r"/fr/[^/]+/(?:appartements|villas_et_riads|maisons|terrains_et_fermes|bureaux)/[^/]*_([0-9]{7,9})\.htm",
        "sarouty.ma": r"/fr/plp/(?:acheter|louer)/[^/]*-([0-9]{5,9})(?:\.html)?",
        "agenz.ma": r"/fr/annonces/immo-[a-z0-9-]+/(?:vente|location)-[^/]+/[^/]+/([0-9]{5,12})",
    }
    m = re.fullmatch(pats[domain], path, flags=re.I)
    if domain == "agenz.ma" and not m:
        m = re.fullmatch(
            r"/(?:fr/)?annonces-achat/appartement/[a-z0-9-]+/[a-z0-9-]+/[a-z0-9-]+/appartement-a-vendre-([0-9]{5,12})",
            path,
        )
    return (domain, m.group(1)) if m else None


def analyze_feenway_mirror(mirror_url: str, supplied_html: str) -> dict:
    domain, path, _ = _url(mirror_url, frozenset(("feenway.com",)))
    mid = MIRROR_RE.fullmatch(path)
    if domain != "feenway.com" or mid is None:
        raise ProvenanceError("INDIVIDUAL_MIRROR_REQUIRED")
    if not isinstance(supplied_html, str) or not supplied_html.lstrip().startswith("<") or len(supplied_html) > 2_000_000:
        raise ProvenanceError("HTML_REQUIRED")
    links = _Links()
    links.feed(supplied_html)
    ctas = [x["href"] for x in links.links if CTA_RE.search(x["text"])]
    identities = {}
    for candidate in ctas:
        origin = _original_identity(candidate)
        if origin is not None:
            identities.setdefault(origin, set()).add(candidate)
    unique = len(identities) == 1 and len(ctas) >= 1 and len(identities[next(iter(identities))]) == 1
    resolved = next(iter(identities)) if unique else None
    candidate_url = next(iter(identities[resolved])) if resolved else None
    return {
        "schema_version": SCHEMA,
        "mirror_source": "feenway.com",
        "mirror_id": mid.group(1),
        "mirror_url": mirror_url,
        "origin_portal": resolved[0] if resolved else None,
        "origin_offer_id": resolved[1] if resolved else None,
        "origin_url_claimed_by_mirror": candidate_url,
        "link_appears_in_supplied_html": bool(candidate_url),
        "origin_page_independently_verified": False,
        "physical_uniqueness_verified": False,
        "eligible_for_private_detail_staging": False,
        "eligible_for_public_admission": False,
        "mirror_is_new_property": False,
        "status": "origin_link_observed_unverified" if resolved else
                  ("ambiguous_origin" if len(identities) > 1 else "origin_not_proven"),
        "source_network_requests": 0,
        "db_writes": 0,
    }


def build_upstream_candidate_queue(mirrors: list[dict]) -> dict:
    """Use original portal URLs directly, never FeenWay IDs as offer IDs.

    Inputs are previously analyzed FeenWay links, NOT trusted live evidence.
    Collapse repeated mirror references to the same upstream (portal, ID).
    Conflicting upstream URL variants fail closed pending canonical review.
    """
    if not isinstance(mirrors, list) or len(mirrors) > 100:
        raise ProvenanceError("INVALID_MIRROR_BATCH")
    upstream, seen_mirrors = {}, set()
    unresolved = 0
    for mirror in mirrors:
        if not isinstance(mirror, dict) or mirror.get("schema_version") != SCHEMA:
            raise ProvenanceError("INVALID_MIRROR_OBSERVATION")
        mid = mirror.get("mirror_id")
        if not isinstance(mid, str) or re.fullmatch(r"\d{3,12}", mid) is None:
            raise ProvenanceError("INVALID_MIRROR_ID")
        if mid in seen_mirrors:
            raise ProvenanceError("DUPLICATE_MIRROR_ID")
        seen_mirrors.add(mid)
        if mirror.get("status") != "origin_link_observed_unverified":
            unresolved += 1
            continue
        url = mirror.get("origin_url_claimed_by_mirror")
        identity = _original_identity(url)
        if identity is None or identity != (
            mirror.get("origin_portal"), mirror.get("origin_offer_id")
        ):
            raise ProvenanceError("UPSTREAM_IDENTITY_MISMATCH")
        key = identity
        old = upstream.get(key)
        if old is not None:
            if old["source_url"] != url:
                raise ProvenanceError("ORIGINAL_ID_URL_CONFLICT")
            old["discovered_via_feenway_ids"].append(mid)
            continue
        upstream[key] = {
            "source_domain": identity[0],
            "source_offer_id": identity[1],
            "source_url": url,
            "discovered_via_feenway_ids": [mid],
            "discovery_method": "feenway_explicit_original_link",
            "record_kind": "url_candidate_only",
            "origin_page_independently_verified": False,
            "detail_observed": False,
            "physical_uniqueness_verified": False,
            "eligible_for_private_detail_staging": False,
            "eligible_for_public_admission": False,
        }
    return {
        "schema_version": SCHEMA,
        "upstream_url_candidates": sorted(
            upstream.values(), key=lambda x: (x["source_domain"], x["source_offer_id"])
        ),
        "candidate_count": len(upstream),
        "unresolved_mirrors": unresolved,
        "physical_unique_properties": None,
        "source_network_requests": 0,
        "db_writes": 0,
        "private_detail_staging_count": 0,
    }


def compare_rendered_claims(mirror: dict, mirror_fields: dict, original_fields: dict) -> dict:
    """Compare manually supplied rendered price/area observations, not raw HTML.

    Requires already-resolved direct original URL. Match is informative, NOT
    independent proof of source HTML, activity, freshness or physical identity.
    """
    if (not isinstance(mirror, dict) or mirror.get("schema_version") != SCHEMA
            or mirror.get("status") != "origin_link_observed_unverified"):
        raise ProvenanceError("MIRROR_LINK_REQUIRED")
    if (not isinstance(mirror_fields, dict) or set(mirror_fields) != {"price_mad", "surface_m2"}
            or not isinstance(original_fields, dict)
            or set(original_fields) != {"source_url", "price_mad", "surface_m2"}
            or original_fields["source_url"] != mirror["origin_url_claimed_by_mirror"]):
        raise ProvenanceError("OBSERVATION_URL_MISMATCH")
    for fields in (mirror_fields, original_fields):
        for name in ("price_mad", "surface_m2"):
            value = fields[name]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not (0 < value < 1e9):
                raise ProvenanceError("INVALID_OBSERVATION")
    equal = {
        field: abs(mirror_fields[field] - original_fields[field]) < 0.01
        for field in ("price_mad", "surface_m2")
    }
    return {
        "source_domain": mirror["origin_portal"],
        "source_offer_id": mirror["origin_offer_id"],
        "observed_fields_equal": equal,
        "rendered_price_and_surface_match": all(equal.values()),
        "raw_source_html_verified": False,
        "availability_verified": False,
        "public_admission": False,
        "db_writes": 0,
        "source_network_requests_by_comparison": 0,
    }


def verify_upstream_snapshot(candidate: dict, private_folder: str) -> dict:
    """Verify a locally captured original URL/ID and replay real L4/V3.

    This is NOT a FeenWay capture, a fresh-property certification, an
    authenticated source signature, or a DB staging admission.
    """
    from pathlib import Path
    from v7_multisource.snapshot_evidence import (
        EvidenceError, verify_evidence, offline_benchmark,
    )
    if (not isinstance(candidate, dict)
            or candidate.get("record_kind") != "url_candidate_only"
            or candidate.get("discovery_method") != "feenway_explicit_original_link"
            or candidate.get("eligible_for_private_detail_staging") is not False
            or candidate.get("eligible_for_public_admission") is not False):
        raise ProvenanceError("NOT_UPSTREAM_URL_ONLY")
    url = candidate.get("source_url")
    identity = _original_identity(url)
    if identity is None or identity != (
            candidate.get("source_domain"), candidate.get("source_offer_id")):
        raise ProvenanceError("CANDIDATE_SOURCE_ID_MISMATCH")
    root = Path(private_folder)
    evidence = verify_evidence(root / "source.html", root / "source.manifest.json")
    manifest = evidence["manifest"]
    if manifest["source_url"] != url:
        raise ProvenanceError("CAPTURE_URL_DOES_NOT_MATCH_ORIGINAL")
    if _original_identity(manifest["source_url"]) != identity:
        raise ProvenanceError("CAPTURE_ID_DOES_NOT_MATCH_ORIGINAL")
    report = offline_benchmark(root / "source.html", root / "source.manifest.json")
    # Real HTML bytes compared by the EXISTING L4 and V3 implementations,
    # with freshness/rights/availability/public admission never inferred.
    return {
        "source_domain": identity[0],
        "source_offer_id": identity[1],
        "source_url": url,
        "raw_sha256_verified_against_manifest": manifest["html_sha256"],
        "captured_at_utc": manifest["captured_at_utc"],
        "byte_count": manifest["bytes"],
        "l4_v3_field_comparison": report["field_comparison"],
        "l4_v3_conflicting_nonempty_fields": report["conflicting_nonempty_fields"],
        "v3_quality_status": report["v3_quality_status"],
        "snapshot_hash_consistency_verified": True,
        "capture_authenticity_independently_certified": False,
        "availability_verified": False,
        "editorial_publication_date_verified": False,
        "eligible_for_private_detail_staging": False,
        "eligible_for_public_admission": False,
        "db_writes": 0,
        "source_network_requests_by_replay": 0,
    }
